import type { SyncPushResponse } from '@zooloo/validation';

export type Rejection = SyncPushResponse['rejected'][number];

/** Recusa de uma mutação: desfaz só o savepoint dela e volta ao cliente com o estado atual. */
export class MutationRejected extends Error {
  constructor(readonly reason: Rejection['reason']) {
    super(reason);
  }
}
