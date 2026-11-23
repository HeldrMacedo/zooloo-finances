import { uuidv7 as uuidv7From } from '@zooloo/sync-core';

/** UUIDv7 gerado no cliente (RNF-SYN-02), com relógio e aleatoriedade do navegador. */
export function uuidv7(
  now: number = Date.now(),
  random: Uint8Array = crypto.getRandomValues(new Uint8Array(10)),
): string {
  return uuidv7From(now, random);
}
