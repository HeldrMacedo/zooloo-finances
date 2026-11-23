import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { uuidv7 } from './ids.js';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidv7', () => {
  it('codifica o tempo nos 48 bits iniciais, com versão e variante', () => {
    expect(uuidv7(0x0196f3a27c1e, new Uint8Array(10))).toBe('0196f3a2-7c1e-7000-8000-000000000000');
    expect(uuidv7(0, new Uint8Array(10).fill(0xff))).toBe('00000000-0000-7fff-bfff-ffffffffffff');
  });

  it('propriedade: sempre UUIDv7 e ordenado pelo tempo', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 47 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.uint8Array({ minLength: 10, maxLength: 10 }),
        (time, delta, random) => {
          const first = uuidv7(time, random);
          expect(first).toMatch(UUID_V7);
          expect(uuidv7(time + delta, random) > first).toBe(true);
        },
      ),
    );
  });
});
