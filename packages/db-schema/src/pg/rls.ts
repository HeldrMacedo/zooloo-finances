import { sql, type SQL } from 'drizzle-orm';
import { type AnyPgColumn, pgPolicy, pgRole } from 'drizzle-orm/pg-core';

/**
 * Papel usado pela API e pelos workers. Não é dono das tabelas e não tem BYPASSRLS; é criado pela
 * infraestrutura, por isso `.existing()` (doc 10 §5, RNF-SEG-08).
 */
export const appRole = pgRole('zooloo_app').existing();

/**
 * Usuário da transação corrente. A camada Repo abre cada transação com
 * `SELECT set_config('app.user_id', <uuid>, true)`. Sem essa configuração o valor é NULL e
 * nenhuma linha passa nas políticas.
 */
export const currentUserId: SQL = sql`nullif(current_setting('app.user_id', true), '')::uuid`;

/** Políticas do titular: só lê e escreve linhas cujo `ownerColumn` é o usuário da transação. */
export function ownerPolicies(ownerColumn: AnyPgColumn) {
  const isOwner = sql`${ownerColumn} = ${currentUserId}`;
  return [
    pgPolicy('owner_select', { for: 'select', to: appRole, using: isOwner }),
    pgPolicy('owner_insert', { for: 'insert', to: appRole, withCheck: isOwner }),
    pgPolicy('owner_update', { for: 'update', to: appRole, using: isOwner, withCheck: isOwner }),
    pgPolicy('owner_delete', { for: 'delete', to: appRole, using: isOwner }),
  ];
}
