import { Inject, Injectable } from '@nestjs/common';
import type { Logger } from '@zooloo/security';
import {
  compareHlc,
  type FieldValue,
  MAX_DRIFT_MS,
  mergeRecord,
  mutationRecord,
  parseHlc,
} from '@zooloo/sync-core';
import {
  SYNC_FIELDS,
  SYNC_IMMUTABLE,
  SYNC_REQUIRED_ON_CREATE,
  type SyncChange,
  type SyncMutation,
  type SyncPullQuery,
  type SyncPullResponse,
  type SyncPushResponse,
} from '@zooloo/validation';
import { LOGGER } from '../../config/tokens.js';
import { DatabaseService, type Tx } from '../../providers/database/database.service.js';
import { CategoryRules } from './category-rules.js';
import { MutationRejected, type Rejection } from './mutation-rejected.js';
import { type StoredRecord, SYNC_ENTITIES, SyncRepo } from './sync.repo.js';

/** Códigos do PostgreSQL que viram recusa da mutação em vez de erro do lote. */
const CONFLICT = '23505';
const INVALID = new Set(['23503', '23502', '23514', '22P02', '22007', '22008']);

function pgCode(error: unknown): string | undefined {
  for (let current: unknown = error; current instanceof Error; current = current.cause) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') {
      return code;
    }
  }
  return undefined;
}

/** Relógio de cada campo; linhas antigas sem `field_hlc` usam o HLC da linha. */
export function toChange(record: StoredRecord): SyncChange {
  const clocks: Record<string, string> = {};
  for (const name of Object.keys(record.fields)) {
    clocks[name] = record.fieldHlc[name] ?? record.hlc;
  }
  return {
    entity: record.entity,
    id: record.id,
    version: record.version,
    fields: record.fields,
    clocks,
  };
}

const maxHlc = (clocks: Readonly<Record<string, string>>): string =>
  Object.values(clocks).reduce((max, clock) => (compareHlc(clock, max) > 0 ? clock : max));

/**
 * Sync do servidor (doc 07 §4): aplica lotes de mutações com merge por campo e entrega o delta por
 * versão. Uma mutação recusada não derruba o lote: volta com o estado atual para o cliente desfazer.
 */
@Injectable()
export class SyncService {
  constructor(
    private readonly database: DatabaseService,
    private readonly repo: SyncRepo,
    private readonly categories: CategoryRules,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  push(
    userId: string,
    mutations: readonly SyncMutation[],
    wallNow: number,
  ): Promise<SyncPushResponse> {
    return this.database.withUser(userId, async (tx) => {
      const version = await this.repo.nextVersion(tx, userId);
      const rejected: Rejection[] = [];
      for (const [index, mutation] of mutations.entries()) {
        try {
          await tx.transaction((savepoint) =>
            this.apply(savepoint, userId, version, mutation, wallNow),
          );
        } catch (error) {
          const reason = this.reasonFor(error);
          const current = await this.repo.find(tx, mutation.entity, mutation.id);
          rejected.push({ index, reason, current: current && toChange(current) });
        }
      }
      if (rejected.length > 0) {
        this.logger.info('sync: mutações recusadas', {
          total: mutations.length,
          rejected: rejected.map(({ index, reason }) => ({ index, reason })),
        });
      }
      return { version, rejected };
    });
  }

  pull(userId: string, { since, limit }: SyncPullQuery): Promise<SyncPullResponse> {
    return this.database.withUser(userId, async (tx) => {
      const fetched: StoredRecord[] = [];
      for (const entity of SYNC_ENTITIES) {
        fetched.push(...(await this.repo.changedSince(tx, entity, since, limit + 1)));
      }
      fetched.sort((a, b) => a.version - b.version || a.id.localeCompare(b.id));
      const page = await this.wholeVersions(tx, fetched, limit);
      const version = page.at(-1)?.version ?? since;
      let hasMore = false;
      for (const entity of SYNC_ENTITIES) {
        hasMore ||= await this.repo.hasChangesAfter(tx, entity, version);
      }
      return { changes: page.map(toChange), version, hasMore };
    });
  }

  /**
   * Corta a página sem dividir uma versão: o cursor é a última versão entregue, então uma versão
   * pela metade perderia linhas. Se a primeira versão sozinha passa do limite, vai inteira.
   */
  private async wholeVersions(
    tx: Tx,
    fetched: readonly StoredRecord[],
    limit: number,
  ): Promise<StoredRecord[]> {
    if (fetched.length <= limit) {
      return [...fetched];
    }
    const boundary = fetched[limit]?.version ?? 0;
    const before = fetched.filter((record) => record.version < boundary);
    if (before.length > 0) {
      return before;
    }
    const all: StoredRecord[] = [];
    for (const entity of SYNC_ENTITIES) {
      all.push(...(await this.repo.atVersion(tx, entity, boundary)));
    }
    return all;
  }

  private async apply(
    tx: Tx,
    userId: string,
    version: number,
    mutation: SyncMutation,
    wallNow: number,
  ): Promise<void> {
    if (parseHlc(mutation.hlc).wall > wallNow + MAX_DRIFT_MS) {
      throw new MutationRejected('invalid');
    }
    const parsed = SYNC_FIELDS[mutation.entity].safeParse(mutation.fields);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      throw new MutationRejected('invalid');
    }
    const fields = parsed.data as Record<string, FieldValue>;
    if (
      mutation.op === 'delete' &&
      (Object.keys(fields).join() !== 'deletedAt' || !fields['deletedAt'])
    ) {
      throw new MutationRejected('invalid');
    }
    const existing = await this.repo.findForUpdate(tx, mutation.entity, mutation.id);
    if (existing) {
      for (const name of SYNC_IMMUTABLE[mutation.entity]) {
        if (name in fields && fields[name] !== existing.fields[name]) {
          throw new MutationRejected('invalid');
        }
      }
    } else if (!SYNC_REQUIRED_ON_CREATE[mutation.entity].every((name) => name in fields)) {
      throw new MutationRejected('not_found');
    }
    const { record, changed } = mergeRecord(
      existing ? { fields: existing.fields, clocks: toChange(existing).clocks } : undefined,
      mutationRecord({ ...mutation, fields }),
    );
    if (changed.length === 0) {
      return;
    }
    const write = {
      entity: mutation.entity,
      id: mutation.id,
      userId,
      version,
      hlc: maxHlc(record.clocks),
      fields: record.fields,
      fieldHlc: record.clocks,
    };
    const context = { userId, version, wallNow };
    if (write.entity === 'categories') {
      await this.categories.validate(tx, existing, write);
    }
    await (existing ? this.repo.update(tx, write) : this.repo.insert(tx, write));
    if (write.entity === 'categories' && changed.includes('deletedAt')) {
      await this.categories.cascadeDelete(tx, write, context);
    }
    if (write.entity === 'profiles' && !existing && !write.fields['deletedAt']) {
      await this.categories.seedProfile(tx, write, context);
    }
  }

  private reasonFor(error: unknown): Rejection['reason'] {
    if (error instanceof MutationRejected) {
      return error.reason;
    }
    const code = pgCode(error);
    if (code === CONFLICT) {
      return 'conflict';
    }
    if (code !== undefined && INVALID.has(code)) {
      return 'invalid';
    }
    throw error;
  }
}
