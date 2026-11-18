import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InvalidInstallmentCountError, splitInstallments } from './installments.js';
import { money, sumMoney } from './money.js';

describe('splitInstallments (RN-LAN-11)', () => {
  it('F2: R$ 100,00 em 3 parcelas = 33,34 + 33,33 + 33,33', () => {
    expect(splitInstallments(money(10_000, 'BRL'), 3).map((p) => p.cents)).toEqual([
      3_334, 3_333, 3_333,
    ]);
  });

  it('divisão exata não gera resíduo', () => {
    expect(splitInstallments(money(9_000, 'BRL'), 3).map((p) => p.cents)).toEqual([
      3_000, 3_000, 3_000,
    ]);
  });

  it('valor negativo (estorno parcelado) mantém o resíduo na 1ª parcela', () => {
    expect(splitInstallments(money(-10_000, 'BRL'), 3).map((p) => p.cents)).toEqual([
      -3_334, -3_333, -3_333,
    ]);
  });

  it('recusa quantidade de parcelas inválida', () => {
    expect(() => splitInstallments(money(100, 'BRL'), 0)).toThrow(InvalidInstallmentCountError);
    expect(() => splitInstallments(money(100, 'BRL'), 1.5)).toThrow(InvalidInstallmentCountError);
  });

  it('propriedade: soma = total, resíduo (< n centavos) só na 1ª parcela', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100_000_000, max: 100_000_000 }),
        fc.integer({ min: 1, max: 420 }),
        (cents, count) => {
          const total = money(cents, 'BRL');
          const parts = splitInstallments(total, count);
          expect(parts).toHaveLength(count);
          expect(sumMoney(parts, 'BRL')).toEqual(total);
          const [first, ...rest] = parts.map((p) => Math.abs(p.cents));
          const base = Math.trunc(Math.abs(cents) / count);
          expect(rest.every((value) => value === base)).toBe(true);
          expect(first! - base).toBeGreaterThanOrEqual(0);
          expect(first! - base).toBeLessThan(count);
        },
      ),
    );
  });
});
