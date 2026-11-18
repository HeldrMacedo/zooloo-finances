import { money } from '@zooloo/domain';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatMoney, InvalidMoneyInputError, parseMoneyInput } from './money-format.js';

const NBSP = '\u00A0';

describe('formatMoney (pt-BR)', () => {
  it('formata centavos sem passar por float', () => {
    expect(formatMoney(money(123_456, 'BRL'))).toBe(`R$${NBSP}1.234,56`);
    expect(formatMoney(money(5, 'BRL'))).toBe(`R$${NBSP}0,05`);
    expect(formatMoney(money(-10_000, 'BRL'))).toBe(`-R$${NBSP}100,00`);
    expect(formatMoney(money(900_719_925_474_099, 'BRL'))).toBe(`R$${NBSP}9.007.199.254.740,99`);
  });

  it('sinal sempre visível para valores de lançamento (RNF-UX-02)', () => {
    expect(formatMoney(money(2_500, 'BRL'), { sign: 'always' })).toBe(`+R$${NBSP}25,00`);
    expect(formatMoney(money(-2_500, 'BRL'), { sign: 'always' })).toBe(`-R$${NBSP}25,00`);
    expect(formatMoney(money(0, 'BRL'), { sign: 'always' })).toBe(`R$${NBSP}0,00`);
  });

  it('modo privado oculta o valor (RNF-UX-03)', () => {
    expect(formatMoney(money(123_456, 'BRL'), { hidden: true })).toBe(`R$${NBSP}••••`);
  });

  it('respeita as casas decimais da moeda', () => {
    expect(formatMoney(money(1_500, 'JPY'))).toBe(`JP¥${NBSP}1.500`);
    expect(formatMoney(money(1_050, 'USD'))).toBe(`US$${NBSP}10,50`);
  });
});

describe('parseMoneyInput', () => {
  it.each([
    ['1.234,56', 123_456],
    ['1234,56', 123_456],
    ['1234', 123_400],
    ['0,5', 50],
    [',99', 99],
    ['R$ 1.234,56', 123_456],
    [`R$${NBSP}10`, 1_000],
    ['-12,30', -1_230],
    ['  7,00 ', 700],
    ['1.000.000', 100_000_000],
  ])('%j = %i centavos', (input, cents) => {
    expect(parseMoneyInput(input, 'BRL')).toEqual(money(cents, 'BRL'));
  });

  it.each([
    '',
    'abc',
    '1,234',
    '1.23,4',
    '12.34',
    '1,2,3',
    '--1',
    '1-',
    'R$',
    '1.2345,00',
    '1,',
    '.500',
    '1..000',
  ])('recusa %j', (input) => {
    expect(() => parseMoneyInput(input, 'BRL')).toThrow(InvalidMoneyInputError);
  });

  it('moeda sem casas decimais não aceita vírgula', () => {
    expect(parseMoneyInput('1.500', 'JPY')).toEqual(money(1_500, 'JPY'));
    expect(() => parseMoneyInput('1,5', 'JPY')).toThrow(InvalidMoneyInputError);
  });

  it('recusa entrada longa demais antes de aplicar a regex', () => {
    expect(() => parseMoneyInput('1'.repeat(41), 'BRL')).toThrow(InvalidMoneyInputError);
  });

  it('recusa valor acima do inteiro seguro', () => {
    expect(() => parseMoneyInput('900.719.925.474.099,92', 'BRL')).toThrow(InvalidMoneyInputError);
  });

  it('propriedade: parseMoneyInput(formatMoney(m)) = m', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1e13, max: 1e13 }), (cents) => {
        const value = money(cents, 'BRL');
        expect(parseMoneyInput(formatMoney(value), 'BRL')).toEqual(value);
      }),
    );
  });
});
