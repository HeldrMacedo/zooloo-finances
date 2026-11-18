import { money } from '@zooloo/domain';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatMoney } from './money-format.js';
import { moneyParts } from './money-parts.js';

describe('moneyParts', () => {
  it('separa sinal, símbolo e número para composição tipográfica', () => {
    expect(moneyParts(money(-123_456, 'BRL'))).toEqual({
      sign: '-',
      currency: 'R$',
      amount: '1.234,56',
    });
    expect(moneyParts(money(2_500, 'BRL'), { sign: 'always' })).toEqual({
      sign: '+',
      currency: 'R$',
      amount: '25,00',
    });
    expect(moneyParts(money(0, 'BRL'), { sign: 'always' }).sign).toBe('');
  });

  it('modo privado oculta só o número', () => {
    expect(moneyParts(money(-5, 'BRL'), { hidden: true })).toEqual({
      sign: '',
      currency: 'R$',
      amount: '••••',
    });
  });

  it('propriedade: as partes reconstroem o texto de formatMoney', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1e13, max: 1e13 }), fc.boolean(), (cents, always) => {
        const value = money(cents, 'BRL');
        const options = { sign: always ? ('always' as const) : ('auto' as const) };
        const parts = moneyParts(value, options);
        expect(`${parts.sign}${parts.currency}\u00A0${parts.amount}`).toBe(
          formatMoney(value, options),
        );
      }),
    );
  });
});
