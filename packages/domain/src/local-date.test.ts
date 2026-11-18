import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  compareLocalDate,
  daysInMonth,
  InvalidLocalDateError,
  localDate,
  parseLocalDate,
  toIsoDate,
  withDayClamped,
} from './local-date.js';

const anyDate = fc
  .record({
    year: fc.integer({ min: 1970, max: 2200 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 31 }),
  })
  .map(({ year, month, day }) => localDate(year, month, Math.min(day, daysInMonth(year, month))));

describe('local-date', () => {
  it('converte de e para ISO (YYYY-MM-DD)', () => {
    expect(parseLocalDate('2026-11-18')).toEqual({ year: 2026, month: 11, day: 18 });
  });

  it('serializa em ISO com zeros à esquerda', () => {
    expect(toIsoDate(localDate(2026, 1, 5))).toBe('2026-01-05');
    expect(toIsoDate(localDate(987, 12, 31))).toBe('0987-12-31');
  });

  it('propriedade: parseLocalDate(toIsoDate(d)) = d', () => {
    fc.assert(
      fc.property(anyDate, (date) => {
        expect(parseLocalDate(toIsoDate(date))).toEqual(date);
      }),
    );
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '26-01-01', '2026-1-01', ''])(
    'recusa data inválida %s',
    (value) => {
      expect(() => parseLocalDate(value)).toThrow(InvalidLocalDateError);
    },
  );

  it('recusa componentes inválidos', () => {
    expect(() => localDate(2026, 2, 29)).toThrow(InvalidLocalDateError);
    expect(() => localDate(2026, 1, 1.5)).toThrow(InvalidLocalDateError);
    expect(() => localDate(0, 1, 1)).toThrow(InvalidLocalDateError);
  });

  it('conhece anos bissextos', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it('soma meses e leva dia 29–31 ao último dia dos meses curtos (RN-LAN-14)', () => {
    expect(addMonths(localDate(2026, 1, 31), 1)).toEqual(localDate(2026, 2, 28));
    expect(addMonths(localDate(2024, 1, 31), 1)).toEqual(localDate(2024, 2, 29));
    expect(addMonths(localDate(2026, 11, 30), 3)).toEqual(localDate(2027, 2, 28));
    expect(addMonths(localDate(2026, 3, 15), -3)).toEqual(localDate(2025, 12, 15));
  });

  it('soma dias atravessando meses e anos', () => {
    expect(addDays(localDate(2026, 12, 31), 1)).toEqual(localDate(2027, 1, 1));
    expect(addDays(localDate(2026, 3, 1), -1)).toEqual(localDate(2026, 2, 28));
  });

  it('ajusta o dia ao mês', () => {
    expect(withDayClamped(2026, 2, 31)).toEqual(localDate(2026, 2, 28));
    expect(withDayClamped(2026, 3, 10)).toEqual(localDate(2026, 3, 10));
  });

  it('compara datas', () => {
    expect(compareLocalDate(localDate(2026, 1, 1), localDate(2026, 1, 2))).toBe(-1);
    expect(compareLocalDate(localDate(2026, 2, 1), localDate(2026, 1, 31))).toBe(1);
    expect(compareLocalDate(localDate(2027, 1, 1), localDate(2026, 12, 31))).toBe(1);
    expect(compareLocalDate(localDate(2026, 1, 1), localDate(2026, 1, 1))).toBe(0);
  });

  it('propriedade: addDays(n) e depois addDays(−n) volta à data', () => {
    fc.assert(
      fc.property(anyDate, fc.integer({ min: -2000, max: 2000 }), (date, n) => {
        expect(addDays(addDays(date, n), -n)).toEqual(date);
      }),
    );
  });

  it('propriedade: addMonths nunca gera data inválida', () => {
    fc.assert(
      fc.property(anyDate, fc.integer({ min: -600, max: 600 }), (date, n) => {
        const result = addMonths(date, n);
        expect(result.day).toBeLessThanOrEqual(daysInMonth(result.year, result.month));
        expect(result.day).toBeLessThanOrEqual(date.day);
      }),
    );
  });
});
