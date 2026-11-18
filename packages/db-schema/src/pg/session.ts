import { sql, type SQL } from 'drizzle-orm';

/**
 * Comando que abre o contexto do usuário na transação corrente. `is_local = true` faz o valor
 * valer só até o COMMIT/ROLLBACK, para não vazar entre requisições que reutilizam a conexão do pool.
 * Deve ser o primeiro comando de toda transação da camada Repo.
 */
export function userContext(userId: string): SQL {
  return sql`select set_config('app.user_id', ${userId}, true)`;
}
