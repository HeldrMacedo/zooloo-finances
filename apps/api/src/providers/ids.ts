import { randomBytes } from 'node:crypto';
import { uuidv7 } from '@zooloo/sync-core';

/** Adaptador de IDs da API: UUIDv7 com relógio e aleatoriedade do sistema. */
export function newId(): string {
  return uuidv7(Date.now(), randomBytes(10));
}
