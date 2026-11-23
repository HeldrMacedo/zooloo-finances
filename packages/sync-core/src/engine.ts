import type { HlcClock } from './hlc.js';
import { mergeRecord, type ReplicaRecord } from './merge.js';
import {
  type Change,
  type Mutation,
  PULL_PAGE_LIMIT,
  PUSH_BATCH_LIMIT,
  type PullPage,
  type PushResult,
  type Rejection,
} from './protocol.js';

/** Mutação ainda não confirmada pelo servidor, na ordem em que foi feita. */
export interface OutboxEntry {
  readonly seq: number;
  readonly mutation: Mutation;
}

/** Registro local já mesclado com uma mudança do servidor, pronto para gravar. */
export interface MergedChange {
  readonly entity: string;
  readonly id: string;
  readonly version: number;
  readonly record: ReplicaRecord;
}

/** Porta do banco local (Repo do app). Cada método é uma transação. */
export interface SyncStore {
  outbox(limit: number): Promise<readonly OutboxEntry[]>;
  /** Remove do outbox as mutações já processadas pelo servidor. */
  acknowledge(seqs: readonly number[]): Promise<void>;
  cursor(): Promise<number>;
  read(entity: string, ids: readonly string[]): Promise<ReadonlyMap<string, ReplicaRecord>>;
  /** Grava os registros mesclados e o novo cursor na mesma transação. */
  apply(changes: readonly MergedChange[], cursor: number): Promise<void>;
  /**
   * Desfaz uma mutação recusada: substitui o registro local pelo estado do servidor (sem merge) ou
   * o apaga se ele não existe no servidor.
   */
  restore(entity: string, id: string, current: Change | null): Promise<void>;
}

/** Porta da rede (API). */
export interface SyncTransport {
  push(mutations: readonly Mutation[]): Promise<PushResult>;
  pull(since: number, limit: number): Promise<PullPage>;
}

export interface RejectedMutation extends Rejection {
  readonly mutation: Mutation;
}

export interface SyncReport {
  readonly pushed: number;
  readonly pulled: number;
  readonly rejected: readonly RejectedMutation[];
  readonly version: number;
}

/** Proteção contra laço sem fim se o servidor insistir em `hasMore`. */
const MAX_ROUNDS = 10_000;

function groupByEntity(changes: readonly Change[]): Map<string, Change[]> {
  const groups = new Map<string, Change[]>();
  for (const change of changes) {
    const group = groups.get(change.entity) ?? [];
    group.push(change);
    groups.set(change.entity, group);
  }
  return groups;
}

/**
 * Ciclo de sync do cliente (doc 07 §4A): envia o outbox e depois puxa o delta, mesclando campo a
 * campo. As escritas locais pendentes têm HLC maior que o do servidor e sobrevivem ao pull; são
 * confirmadas no próximo push. Uma chamada durante outro ciclo reaproveita o ciclo em andamento.
 */
export class SyncEngine {
  private running: Promise<SyncReport> | null = null;

  constructor(
    private readonly store: SyncStore,
    private readonly transport: SyncTransport,
    private readonly clock: HlcClock,
  ) {}

  sync(): Promise<SyncReport> {
    this.running ??= this.run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async run(): Promise<SyncReport> {
    const { pushed, rejected } = await this.pushAll();
    const { pulled, version } = await this.pullAll();
    return { pushed, pulled, rejected, version };
  }

  private async pushAll(): Promise<{ pushed: number; rejected: RejectedMutation[] }> {
    let pushed = 0;
    const rejected: RejectedMutation[] = [];
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const batch = await this.store.outbox(PUSH_BATCH_LIMIT);
      if (batch.length === 0) {
        break;
      }
      const mutations = batch.map((entry) => entry.mutation);
      const result = await this.transport.push(mutations);
      await this.store.acknowledge(batch.map((entry) => entry.seq));
      for (const rejection of result.rejected) {
        const mutation = mutations[rejection.index];
        if (mutation) {
          await this.store.restore(mutation.entity, mutation.id, rejection.current);
          rejected.push({ ...rejection, mutation });
        }
      }
      pushed += batch.length;
    }
    return { pushed, rejected };
  }

  private async pullAll(): Promise<{ pulled: number; version: number }> {
    let since = await this.store.cursor();
    let pulled = 0;
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const page = await this.transport.pull(since, PULL_PAGE_LIMIT);
      const merged: MergedChange[] = [];
      for (const [entity, changes] of groupByEntity(page.changes)) {
        const local = await this.store.read(
          entity,
          changes.map((change) => change.id),
        );
        for (const change of changes) {
          for (const clock of Object.values(change.clocks)) {
            this.clock.observe(clock);
          }
          const { record } = mergeRecord(local.get(change.id), change);
          merged.push({ entity, id: change.id, version: change.version, record });
        }
      }
      await this.store.apply(merged, page.version);
      pulled += page.changes.length;
      since = page.version;
      if (!page.hasMore) {
        break;
      }
    }
    return { pulled, version: since };
  }
}
