import type { LocalDate } from '@zooloo/domain';
import { LOCALE } from './money-format.js';

export type DateStyle = 'short' | 'dayMonth' | 'long' | 'month' | 'weekday';

const STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: '2-digit', year: 'numeric' },
  dayMonth: { day: '2-digit', month: '2-digit' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  month: { month: 'long', year: 'numeric' },
  weekday: { weekday: 'long', day: 'numeric', month: 'long' },
};

/**
 * Formata data de negócio em pt-BR. Usa UTC só como calendário: `LocalDate` não tem fuso, então
 * o dia exibido é sempre o dia gravado (RNF-FIN-02).
 */
export function formatLocalDate(date: LocalDate, style: DateStyle = 'short'): string {
  return new Intl.DateTimeFormat(LOCALE, { ...STYLES[style], timeZone: 'UTC' }).format(
    Date.UTC(date.year, date.month - 1, date.day),
  );
}
