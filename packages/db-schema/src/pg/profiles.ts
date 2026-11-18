import { sql } from 'drizzle-orm';
import {
  check,
  char,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
} from 'drizzle-orm/pg-core';
import { syncColumns, timestamptz } from './columns.js';
import { ownerPolicies } from './rls.js';
import { users } from './users.js';

/** Perfil: controle financeiro independente dentro do usuário (RN-PRF-01, doc 05 §1). */
export const profiles = pgTable(
  'profiles',
  {
    ...syncColumns(),
    name: text('name').notNull(),
    /** ISO 4217; imutável depois que houver lançamentos (RN-PRF-02). */
    currency: char('currency', { length: 3 }).notNull(),
    color: text('color').notNull(),
    icon: text('icon').notNull(),
    archivedAt: timestamptz('archived_at'),
    sortOrder: integer('sort_order').notNull().default(0),
    settings: jsonb('settings').notNull().default({}),
  },
  (table) => [
    foreignKey({
      name: 'profiles_user_fk',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    // Alvo das FKs compostas (profile_id, user_id): impede referenciar perfil de outro usuário.
    unique('profiles_id_user_unique').on(table.id, table.userId),
    check('profiles_currency_iso', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    ...ownerPolicies(table.userId),
  ],
).enableRLS();
