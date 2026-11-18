import { localDate } from '@zooloo/domain';
import { describe, expect, it } from 'vitest';
import { formatLocalDate } from './date-format.js';

describe('formatLocalDate (pt-BR)', () => {
  const date = localDate(2026, 11, 8);

  it('curto: dd/mm/aaaa', () => {
    expect(formatLocalDate(date)).toBe('08/11/2026');
  });

  it('longo: dia de mês de ano', () => {
    expect(formatLocalDate(date, 'long')).toBe('8 de novembro de 2026');
  });

  it('mês: para filtros e títulos de período', () => {
    expect(formatLocalDate(date, 'month')).toBe('novembro de 2026');
  });

  it('dia da semana: para seções do extrato', () => {
    expect(formatLocalDate(date, 'weekday')).toBe('domingo, 8 de novembro');
  });

  it('não sofre efeito de fuso: 1º de janeiro continua 1º de janeiro', () => {
    expect(formatLocalDate(localDate(2027, 1, 1))).toBe('01/01/2027');
  });
});
