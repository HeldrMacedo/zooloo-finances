/**
 * Adaptador de relógio: único ponto do web-app que lê a hora do sistema. Devolve timestamp técnico
 * UTC (created_at, updated_at); datas de negócio usam `LocalDate` (RNF-FIN-02).
 */
export function nowIso(): string {
  // eslint-disable-next-line no-restricted-syntax -- adaptador de relógio (doc 12 §5.2).
  return new Date().toISOString();
}
