import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  addMoney,
  compareMoney,
  CurrencyMismatchError,
  InvalidMoneyError,
  isNegative,
  isZero,
  money,
  negateMoney,
  subtractMoney,
  sumMoney,
  zeroMoney,
} from './money.js';

const cents = fc.integer({ min: -1_000_000_000_00, max: 1_000_000_000_00 });

describe('money', () => {
  it('cria valor em centavos inteiros com moeda', () => {
    expect(money(10_000, 'BRL')).toEqual({ cents: 10_000, currency: 'BRL' });
  });

  it('recusa centavos fracionados (RNF-FIN-01)', () => {
    expect(() => money(10.5, 'BRL')).toThrow(InvalidMoneyError);
  });

  it('recusa inteiros fora da faixa segura', () => {
    expect(() => money(Number.MAX_SAFE_INTEGER + 1, 'BRL')).toThrow(InvalidMoneyError);
  });

  it('recusa código de moeda fora do ISO 4217', () => {
    expect(() => money(1, 'real')).toThrow(InvalidMoneyError);
  });

  it('normaliza -0 para 0', () => {
    expect(Object.is(money(-0, 'BRL').cents, 0)).toBe(true);
  });

  it('soma e subtrai na mesma moeda', () => {
    expect(addMoney(money(150, 'BRL'), money(50, 'BRL'))).toEqual(money(200, 'BRL'));
    expect(subtractMoney(money(150, 'BRL'), money(50, 'BRL'))).toEqual(money(100, 'BRL'));
  });

  it('recusa operar moedas diferentes', () => {
    expect(() => addMoney(money(1, 'BRL'), money(1, 'USD'))).toThrow(CurrencyMismatchError);
    expect(() => compareMoney(money(1, 'BRL'), money(1, 'USD'))).toThrow(CurrencyMismatchError);
  });

  it('nega, compara e testa sinal', () => {
    expect(negateMoney(money(30, 'BRL'))).toEqual(money(-30, 'BRL'));
    expect(compareMoney(money(1, 'BRL'), money(2, 'BRL'))).toBe(-1);
    expect(compareMoney(money(2, 'BRL'), money(2, 'BRL'))).toBe(0);
    expect(compareMoney(money(3, 'BRL'), money(2, 'BRL'))).toBe(1);
    expect(isZero(zeroMoney('BRL'))).toBe(true);
    expect(isZero(money(1, 'BRL'))).toBe(false);
    expect(isNegative(money(-1, 'BRL'))).toBe(true);
    expect(isNegative(money(0, 'BRL'))).toBe(false);
  });

  it('soma lista vazia como zero na moeda pedida', () => {
    expect(sumMoney([], 'BRL')).toEqual(zeroMoney('BRL'));
    expect(sumMoney([money(1, 'BRL'), money(2, 'BRL')], 'BRL')).toEqual(money(3, 'BRL'));
  });

  it('propriedade: a + b − b = a', () => {
    fc.assert(
      fc.property(cents, cents, (a, b) => {
        const result = subtractMoney(addMoney(money(a, 'BRL'), money(b, 'BRL')), money(b, 'BRL'));
        expect(result).toEqual(money(a, 'BRL'));
      }),
    );
  });
});
