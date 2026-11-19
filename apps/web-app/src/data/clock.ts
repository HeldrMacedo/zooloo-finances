import { type LocalDate, localDate } from '@zooloo/domain';

/**
 * Adaptador de relógio: único ponto do web-app que lê a hora do sistema. Devolve timestamp técnico
 * UTC (created_at, updated_at); datas de negócio usam `LocalDate` (RNF-FIN-02).
 */
export function nowIso(): string {
  // eslint-disable-next-line no-restricted-syntax -- adaptador de relógio (doc 12 §5.2).
  return new Date().toISOString();
}

/** Data de hoje no fuso do dispositivo, como data de negócio. */
export function todayLocal(): LocalDate {
  // eslint-disable-next-line no-restricted-syntax -- adaptador de relógio (doc 12 §5.2).
  const now = new Date();
  return localDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Hora local (0–23), para a saudação do cabeçalho. */
export function currentHour(): number {
  // eslint-disable-next-line no-restricted-syntax -- adaptador de relógio (doc 12 §5.2).
  return new Date().getHours();
}
