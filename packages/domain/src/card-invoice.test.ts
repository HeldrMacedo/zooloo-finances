import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  closingDateForDueDate,
  type CreditCardCycle,
  InvalidCardCycleError,
  invoiceDueDateForPurchase,
} from './card-invoice.js';
import { addDays, addMonths, compareLocalDate, daysInMonth, localDate } from './local-date.js';

const daysBefore = (dueDay: number, days: number): CreditCardCycle => ({
  dueDay,
  closing: { kind: 'days-before-due', days },
});

const fixedDay = (dueDay: number, day: number): CreditCardCycle => ({
  dueDay,
  closing: { kind: 'fixed-day', day },
});

const anyCycle: fc.Arbitrary<CreditCardCycle> = fc.oneof(
  fc
    .tuple(fc.integer({ min: 1, max: 31 }), fc.integer({ min: 1, max: 25 }))
    .map(([due, days]) => daysBefore(due, days)),
  fc
    .tuple(fc.integer({ min: 1, max: 31 }), fc.integer({ min: 1, max: 31 }))
    .map(([due, day]) => fixedDay(due, day)),
);

const anyDate = fc
  .record({
    year: fc.integer({ min: 2000, max: 2100 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 31 }),
  })
  .map(({ year, month, day }) => localDate(year, month, Math.min(day, daysInMonth(year, month))));

describe('card-invoice (RN-CRT-02, RN-CRT-03)', () => {
  it('F3: vencimento 10, fechamento 7 dias antes; compra no dia 3 entra na fatura do dia 10', () => {
    const card = daysBefore(10, 7);
    expect(invoiceDueDateForPurchase(localDate(2026, 11, 3), card)).toEqual(
      localDate(2026, 11, 10),
    );
  });

  it('F3: compra no dia 4 entra na fatura do mês seguinte', () => {
    const card = daysBefore(10, 7);
    expect(invoiceDueDateForPurchase(localDate(2026, 11, 4), card)).toEqual(
      localDate(2026, 12, 10),
    );
  });

  it('fechamento em dia fixo antes do vencimento fica no mesmo mês', () => {
    const card = fixedDay(15, 5);
    expect(closingDateForDueDate(localDate(2026, 11, 15), card)).toEqual(localDate(2026, 11, 5));
    expect(invoiceDueDateForPurchase(localDate(2026, 11, 5), card)).toEqual(
      localDate(2026, 11, 15),
    );
    expect(invoiceDueDateForPurchase(localDate(2026, 11, 6), card)).toEqual(
      localDate(2026, 12, 15),
    );
  });

  it('fechamento em dia fixo depois do vencimento fica no mês anterior', () => {
    const card = fixedDay(5, 25);
    expect(closingDateForDueDate(localDate(2026, 12, 5), card)).toEqual(localDate(2026, 11, 25));
    expect(invoiceDueDateForPurchase(localDate(2026, 11, 26), card)).toEqual(localDate(2027, 1, 5));
  });

  it('vencimento no dia 31 cai no último dia dos meses curtos', () => {
    const card = daysBefore(31, 7);
    expect(invoiceDueDateForPurchase(localDate(2026, 2, 10), card)).toEqual(localDate(2026, 2, 28));
  });

  it.each([
    daysBefore(0, 7),
    daysBefore(32, 7),
    daysBefore(10, 0),
    daysBefore(10, 29),
    fixedDay(10, 0),
    fixedDay(10, 32),
    daysBefore(10.5, 7),
  ])('recusa ciclo inválido %o', (card) => {
    expect(() => invoiceDueDateForPurchase(localDate(2026, 1, 1), card)).toThrow(
      InvalidCardCycleError,
    );
  });

  it('propriedade: a compra entra na primeira fatura cujo fechamento é no dia da compra ou depois', () => {
    fc.assert(
      fc.property(anyDate, anyCycle, (purchase, card) => {
        const due = invoiceDueDateForPurchase(purchase, card);
        const previousDue = addMonths(due, -1);
        const previous = localDate(
          previousDue.year,
          previousDue.month,
          Math.min(card.dueDay, daysInMonth(previousDue.year, previousDue.month)),
        );
        expect(compareLocalDate(closingDateForDueDate(due, card), purchase)).toBeGreaterThanOrEqual(
          0,
        );
        expect(compareLocalDate(closingDateForDueDate(previous, card), purchase)).toBe(-1);
        expect(compareLocalDate(due, addDays(purchase, 70))).toBe(-1);
      }),
    );
  });
});
