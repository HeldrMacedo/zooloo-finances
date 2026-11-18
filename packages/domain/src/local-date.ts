/**
 * Data de negócio sem fuso (RNF-FIN-02). Nunca usar `Date` para datas de lançamento,
 * vencimento ou efetivação: sempre `LocalDate`.
 */
export interface LocalDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export class InvalidLocalDateError extends Error {
  override readonly name = 'InvalidLocalDateError';
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

export function localDate(year: number, month: number, day: number): LocalDate {
  const valid =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month);
  if (!valid) {
    throw new InvalidLocalDateError(`Data inválida: ${year}-${month}-${day}.`);
  }
  return { year, month, day };
}

export function parseLocalDate(value: string): LocalDate {
  const match = ISO_DATE.exec(value);
  if (!match) {
    throw new InvalidLocalDateError(`Data precisa estar em YYYY-MM-DD; recebido "${value}".`);
  }
  return localDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function toIsoDate(date: LocalDate): string {
  const pad = (value: number, width: number): string => String(value).padStart(width, '0');
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

/** Cria a data no mês pedido levando o dia ao último dia quando o mês é curto (RN-LAN-14). */
export function withDayClamped(year: number, month: number, day: number): LocalDate {
  return localDate(year, month, Math.min(day, daysInMonth(year, month)));
}

export function addMonths(date: LocalDate, months: number): LocalDate {
  const index = date.year * 12 + (date.month - 1) + months;
  return withDayClamped(Math.floor(index / 12), (index % 12) + 1, date.day);
}

// Date.UTC é usado só como aritmética de calendário; nenhum fuso entra no resultado.
export function addDays(date: LocalDate, days: number): LocalDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day) + days * MS_PER_DAY);
  return localDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export function compareLocalDate(a: LocalDate, b: LocalDate): -1 | 0 | 1 {
  const delta = a.year - b.year || a.month - b.month || a.day - b.day;
  return delta < 0 ? -1 : delta > 0 ? 1 : 0;
}
