import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { divideHalfEven } from './rounding.js';

describe('divideHalfEven (RNF-FIN-04)', () => {
  it.each([
    [5, 2, 2],
    [7, 2, 4],
    [-5, 2, -2],
    [-7, 2, -4],
    [10, 3, 3],
    [20, 3, 7],
    [-20, 3, -7],
    [10, -4, -2],
    [0, 5, 0],
  ])('%i / %i = %i', (dividend, divisor, expected) => {
    expect(divideHalfEven(dividend, divisor)).toBe(expected);
  });

  it('recusa divisor zero ou não inteiro', () => {
    expect(() => divideHalfEven(1, 0)).toThrow(RangeError);
    expect(() => divideHalfEven(1.5, 2)).toThrow(RangeError);
  });

  it('propriedade: erro de arredondamento ≤ meio divisor', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (dividend, divisor) => {
          const quotient = divideHalfEven(dividend, divisor);
          expect(Math.abs(dividend - quotient * divisor) * 2).toBeLessThanOrEqual(divisor);
        },
      ),
    );
  });
});
