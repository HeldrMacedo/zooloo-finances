import type { FieldClocks, Fields, ReplicaRecord } from './merge.js';

/**
 * Protocolo de sync (doc 07 §4). Push: lote de mutações `{entity, id, op, fields, hlc}`. Pull:
 * mudanças com `server_version > since`, em páginas.
 */
export type MutationOp = 'upsert' | 'delete';

export interface Mutation {
  readonly entity: string;
  readonly id: string;
  readonly op: MutationOp;
  /** Só os campos alterados nesta mutação; `delete` traz `deletedAt`. */
  readonly fields: Fields;
  /** HLC da mutação, aplicado a todos os seus campos. */
  readonly hlc: string;
}

export type RejectionReason = 'invalid' | 'conflict' | 'not_found';

export interface Rejection {
  /** Posição da mutação no lote enviado. */
  readonly index: number;
  readonly reason: RejectionReason;
  /** Estado do registro no servidor, para o cliente desfazer a mudança recusada; `null` se não existe. */
  readonly current: Change | null;
}

export interface PushResult {
  /** `server_version` do usuário depois do lote. */
  readonly version: number;
  readonly rejected: readonly Rejection[];
}

/** Estado atual de um registro no servidor, com o HLC de cada campo. */
export interface Change {
  readonly entity: string;
  readonly id: string;
  readonly version: number;
  readonly fields: Fields;
  readonly clocks: FieldClocks;
}

export interface PullPage {
  readonly changes: readonly Change[];
  /** Cursor para o próximo pull: maior versão entregue (ou o `since` pedido, se vazio). */
  readonly version: number;
  readonly hasMore: boolean;
}

export const PUSH_BATCH_LIMIT = 500;
export const PULL_PAGE_LIMIT = 1000;

/** A mutação como registro de réplica: todos os campos com o HLC da mutação. */
export function mutationRecord(mutation: Mutation): ReplicaRecord {
  const clocks: Record<string, string> = {};
  for (const name of Object.keys(mutation.fields)) {
    clocks[name] = mutation.hlc;
  }
  return { fields: mutation.fields, clocks };
}
