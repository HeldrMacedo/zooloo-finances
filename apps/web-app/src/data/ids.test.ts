import { IdSchema } from '@zooloo/validation';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { nowIso } from './clock.js';
import { uuidv7 } from './ids.js';

describe('uuidv7', () => {
  it('codifica o tempo nos 48 bits iniciais e passa no IdSchema', () => {
    const id = uuidv7(0x0196f3a27c1e, new Uint8Array(10));
    expect(id).toBe('0196f3a2-7c1e-7000-8000-000000000000');
    expect(IdSchema.safeParse(id).success).toBe(true);
  });

  it('propriedade: sempre UUIDv7 válido e ordenado pelo tempo', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 47 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.uint8Array({ minLength: 10, maxLength: 10 }),
        (time, delta, random) => {
          const first = uuidv7(time, random);
          expect(IdSchema.safeParse(first).success).toBe(true);
          expect(uuidv7(time + delta, random) > first).toBe(true);
        },
      ),
    );
  });

  it('usa relógio e aleatoriedade reais por padrão', () => {
    expect(uuidv7()).not.toBe(uuidv7());
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
