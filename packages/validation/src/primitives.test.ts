import { localDate, money } from '@zooloo/domain';
import { describe, expect, it } from 'vitest';
import {
  CentsSchema,
  CurrencySchema,
  CursorPageQuerySchema,
  HexColorSchema,
  IdempotencyKeySchema,
  IdSchema,
  IsoDateTimeSchema,
  LocalDateSchema,
  MoneySchema,
} from './primitives.js';

const UUID_V7 = '0196f3a2-7c1e-7b3a-9c2d-1234567890ab';
const UUID_V4 = '550e8400-e29b-41d4-a716-446655440000';

describe('primitivos', () => {
  it('IdSchema aceita só UUIDv7 gerado no cliente (RNF-SYN-02)', () => {
    expect(IdSchema.parse(UUID_V7)).toBe(UUID_V7);
    expect(IdSchema.safeParse(UUID_V4).success).toBe(false);
  });

  it('LocalDateSchema converte YYYY-MM-DD em LocalDate (RNF-FIN-02)', () => {
    expect(LocalDateSchema.parse('2026-11-18')).toEqual(localDate(2026, 11, 18));
  });

  it.each(['2026-02-30', '18/11/2026', '2026-11-18T00:00:00Z', 20261118])(
    'LocalDateSchema recusa %s',
    (value) => {
      const result = LocalDateSchema.safeParse(value);
      expect(result.success).toBe(false);
    },
  );

  it('LocalDateSchema explica o erro de data inexistente', () => {
    const result = LocalDateSchema.safeParse('2026-02-30');
    expect(result.error?.issues[0]?.message).toBe('Data inexistente.');
  });

  it('CentsSchema exige inteiro seguro (RNF-FIN-01)', () => {
    expect(CentsSchema.parse(-10_050)).toBe(-10_050);
    expect(CentsSchema.safeParse(10.5).success).toBe(false);
    expect(CentsSchema.safeParse('100').success).toBe(false);
    expect(CentsSchema.safeParse(2 ** 53).success).toBe(false);
  });

  it('CurrencySchema exige ISO 4217 em maiúsculas', () => {
    expect(CurrencySchema.parse('BRL')).toBe('BRL');
    expect(CurrencySchema.safeParse('brl').success).toBe(false);
    expect(CurrencySchema.safeParse('REAL').success).toBe(false);
  });

  it('MoneySchema produz Money e recusa campos extras', () => {
    expect(MoneySchema.parse({ cents: 100, currency: 'BRL' })).toEqual(money(100, 'BRL'));
    expect(MoneySchema.safeParse({ cents: 100, currency: 'BRL', amount: 1 }).success).toBe(false);
  });

  it('HexColorSchema normaliza para maiúsculas', () => {
    expect(HexColorSchema.parse('#16b89a')).toBe('#16B89A');
    expect(HexColorSchema.safeParse('#FFF').success).toBe(false);
    expect(HexColorSchema.safeParse('red').success).toBe(false);
  });

  it('IsoDateTimeSchema exige timestamp UTC com Z', () => {
    expect(IsoDateTimeSchema.parse('2026-11-18T13:00:00.000Z')).toBe('2026-11-18T13:00:00.000Z');
    expect(IsoDateTimeSchema.safeParse('2026-11-18T13:00:00-03:00').success).toBe(false);
  });

  it('IdempotencyKeySchema exige UUID de qualquer versão', () => {
    expect(IdempotencyKeySchema.parse(UUID_V4)).toBe(UUID_V4);
    expect(IdempotencyKeySchema.safeParse('abc').success).toBe(false);
  });

  it('CursorPageQuerySchema aplica padrão e limites', () => {
    expect(CursorPageQuerySchema.parse({})).toEqual({ limit: 50 });
    expect(CursorPageQuerySchema.parse({ limit: '200', cursor: 'eyJ2IjoxfQ' })).toEqual({
      limit: 200,
      cursor: 'eyJ2IjoxfQ',
    });
    expect(CursorPageQuerySchema.safeParse({ limit: '201' }).success).toBe(false);
    expect(CursorPageQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(CursorPageQuerySchema.safeParse({ cursor: 'não base64!' }).success).toBe(false);
    expect(CursorPageQuerySchema.safeParse({ cursor: 'a'.repeat(513) }).success).toBe(false);
  });
});
