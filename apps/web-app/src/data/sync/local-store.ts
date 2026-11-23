import { categories, profiles, syncMeta, syncOutbox } from '@zooloo/db-schema/local';
import {
  type Change,
  compareHlc,
  type FieldValue,
  type Fields,
  HlcClock,
  type MergedChange,
  mergeRecord,
  type Mutation,
  type MutationOp,
  mutationRecord,
  type OutboxEntry,
  type ReplicaRecord,
  type SyncStore,
} from '@zooloo/sync-core';
import { asc, count, eq, inArray } from 'drizzle-orm';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { nowIso } from '../clock.js';

export type SyncedEntity = 'profiles' | 'categories';

/** Campos sincronizados por entidade; os nomes do protocolo são as propriedades do Drizzle. */
const ENTITIES = {
  profiles: {
    table: profiles,
    fields: ['name', 'currency', 'color', 'icon', 'archivedAt', 'sortOrder', 'deletedAt'],
  },
  categories: {
    table: categories,
    fields: [
      'profileId',
      'type',
      'name',
      'parentId',
      'icon',
      'color',
      'isSystem',
      'archivedAt',
      'sortOrder',
      'deletedAt',
    ],
  },
} as const;

/** As duas tabelas têm as colunas de sync; a tabela concreta varia por entidade. */
type AnyTable = typeof profiles;
const tableOf = (entity: string): AnyTable => {
  const spec = ENTITIES[entity as SyncedEntity] as { table: unknown } | undefined;
  if (!spec) {
    throw new Error(`Entidade de sync desconhecida: ${entity}.`);
  }
  return spec.table as AnyTable;
};
const fieldsOf = (entity: string): readonly string[] => ENTITIES[entity as SyncedEntity].fields;

const META = { cursor: 'cursor', clock: 'clock', node: 'node' } as const;

const maxHlc = (clocks: Readonly<Record<string, string>>): string =>
  Object.values(clocks).reduce((max, clock) => (compareHlc(clock, max) > 0 ? clock : max), '');

/** Nó do HLC: 16 dígitos hexadecimais aleatórios, gerados uma vez por banco local. */
function randomNode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Banco local como réplica do sync (porta `SyncStore` de `@zooloo/sync-core`) e caminho das escritas
 * locais: grava o registro e a mutação no outbox. O merge é idempotente, então uma escrita
 * interrompida no meio é corrigida no próximo pull (o proxy do SQLite não abre transação entre
 * mensagens; ADR-0007).
 */
export class LocalSyncStore implements SyncStore {
  private constructor(
    private readonly db: SqliteRemoteDatabase,
    private readonly userId: string,
    readonly clock: HlcClock,
  ) {}

  /** Abre a réplica: lê (ou cria) o nó deste banco e o último HLC salvo. */
  static async open(
    db: SqliteRemoteDatabase,
    userId: string,
    wallClock: () => number,
  ): Promise<LocalSyncStore> {
    const store = new LocalSyncStore(db, userId, new HlcClock('0000000000000000', wallClock));
    let node = await store.meta(META.node);
    if (node === null) {
      node = randomNode();
      await store.setMeta(META.node, node);
    }
    const last = await store.meta(META.clock);
    return new LocalSyncStore(db, userId, new HlcClock(node, wallClock, last ?? undefined));
  }

  /** Escrita feita neste dispositivo: aplica já no banco local e enfileira para o servidor. */
  async write(
    entity: SyncedEntity,
    id: string,
    fields: Fields,
    op: MutationOp = 'upsert',
  ): Promise<Mutation> {
    const mutation: Mutation = { entity, id, op, fields, hlc: this.clock.next() };
    const current = (await this.read(entity, [id])).get(id);
    const { record } = mergeRecord(current, mutationRecord(mutation));
    await this.upsert(entity, id, record, null);
    await this.db.insert(syncOutbox).values({
      entity,
      recordId: id,
      op,
      fields: mutation.fields as Record<string, unknown>,
      hlc: mutation.hlc,
    });
    await this.saveClock();
    return mutation;
  }

  async pendingCount(): Promise<number> {
    const [row] = await this.db.select({ total: count() }).from(syncOutbox);
    return row?.total ?? 0;
  }

  async outbox(limit: number): Promise<readonly OutboxEntry[]> {
    const rows = await this.db.select().from(syncOutbox).orderBy(asc(syncOutbox.seq)).limit(limit);
    return rows.map((row) => ({
      seq: row.seq,
      mutation: {
        entity: row.entity,
        id: row.recordId,
        op: row.op,
        fields: row.fields as Fields,
        hlc: row.hlc,
      },
    }));
  }

  async acknowledge(seqs: readonly number[]): Promise<void> {
    if (seqs.length > 0) {
      await this.db.delete(syncOutbox).where(inArray(syncOutbox.seq, [...seqs]));
    }
  }

  async cursor(): Promise<number> {
    return Number((await this.meta(META.cursor)) ?? 0);
  }

  async read(entity: string, ids: readonly string[]): Promise<ReadonlyMap<string, ReplicaRecord>> {
    const table = tableOf(entity);
    const rows = await this.db
      .select()
      .from(table)
      .where(inArray(table.id, [...ids]));
    const found = new Map<string, ReplicaRecord>();
    for (const row of rows as unknown as Record<string, FieldValue>[]) {
      const fields: Record<string, FieldValue> = {};
      for (const name of fieldsOf(entity)) {
        fields[name] = row[name] ?? null;
      }
      found.set(String(row['id']), {
        fields,
        clocks: (row['fieldHlc'] ?? {}) as Record<string, string>,
      });
    }
    return found;
  }

  async apply(changes: readonly MergedChange[], cursor: number): Promise<void> {
    for (const change of changes) {
      await this.upsert(change.entity, change.id, change.record, change.version);
    }
    await this.setMeta(META.cursor, String(cursor));
    await this.saveClock();
  }

  async restore(entity: string, id: string, current: Change | null): Promise<void> {
    const table = tableOf(entity);
    if (current === null) {
      await this.db.delete(table).where(eq(table.id, id));
      return;
    }
    await this.db.delete(table).where(eq(table.id, id));
    await this.upsert(
      entity,
      id,
      { fields: current.fields, clocks: current.clocks },
      current.version,
    );
  }

  private async upsert(
    entity: string,
    id: string,
    record: ReplicaRecord,
    version: number | null,
  ): Promise<void> {
    const table = tableOf(entity);
    const now = nowIso();
    const synced: Record<string, unknown> = {};
    for (const name of fieldsOf(entity)) {
      if (name in record.fields) {
        synced[name] = record.fields[name];
      }
    }
    const control = {
      hlc: maxHlc(record.clocks),
      fieldHlc: record.clocks,
      updatedAt: now,
      ...(version === null ? {} : { serverVersion: version }),
    };
    await this.db
      .insert(table)
      .values({ id, userId: this.userId, createdAt: now, ...control, ...synced } as never)
      .onConflictDoUpdate({ target: table.id, set: { ...control, ...synced } as never });
  }

  private async meta(key: string): Promise<string | null> {
    const [row] = await this.db.select().from(syncMeta).where(eq(syncMeta.key, key));
    return row?.value ?? null;
  }

  private async setMeta(key: string, value: string): Promise<void> {
    await this.db
      .insert(syncMeta)
      .values({ key, value })
      .onConflictDoUpdate({ target: syncMeta.key, set: { value } });
  }

  private saveClock(): Promise<void> {
    return this.setMeta(META.clock, this.clock.last);
  }
}
