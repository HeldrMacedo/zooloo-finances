import { bigint, foreignKey, pgTable, uuid } from 'drizzle-orm/pg-core';
import { auditTimestamps } from './columns.js';
import { ownerPolicies } from './rls.js';
import { users } from './users.js';

/**
 * Versão de sync do usuário (RNF-SYN-03): contador monotônico por usuário. Cada push incrementa
 * com `UPDATE … RETURNING`, que trava a linha e serializa os pushes do mesmo usuário; o pull
 * entrega as linhas com `server_version` maior que o cursor do cliente.
 */
export const syncState = pgTable(
  'sync_state',
  {
    userId: uuid('user_id').primaryKey(),
    version: bigint('version', { mode: 'number' }).notNull().default(0),
    ...auditTimestamps(),
  },
  (table) => [
    foreignKey({
      name: 'sync_state_user_fk',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    ...ownerPolicies(table.userId),
  ],
).enableRLS();
