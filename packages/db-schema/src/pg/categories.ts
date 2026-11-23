import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { syncColumns, timestamptz } from './columns.js';
import { profiles } from './profiles.js';
import { ownerPolicies } from './rls.js';

export const categoryType = pgEnum('category_type', ['income', 'expense']);

/** Categoria e subcategoria, 2 níveis (RN-CAT-01..07, doc 05 §2). */
export const categories = pgTable(
  'categories',
  {
    ...syncColumns(),
    profileId: uuid('profile_id').notNull(),
    type: categoryType('type').notNull(),
    name: text('name').notNull(),
    parentId: uuid('parent_id'),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    /** "Outros": uma por tipo, não pode ser excluída (RN-CAT-03). */
    isSystem: boolean('is_system').notNull().default(false),
    archivedAt: timestamptz('archived_at'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    // Perfil do mesmo usuário: FK composta contra profiles(id, user_id).
    foreignKey({
      name: 'categories_profile_fk',
      columns: [table.profileId, table.userId],
      foreignColumns: [profiles.id, profiles.userId],
    }).onDelete('cascade'),
    // Pai no mesmo perfil.
    unique('categories_id_profile_unique').on(table.id, table.profileId),
    foreignKey({
      name: 'categories_parent_fk',
      columns: [table.parentId, table.profileId],
      foreignColumns: [table.id, table.profileId],
    }),
    check('categories_not_own_parent', sql`${table.parentId} <> ${table.id}`),
    // Nome único por (perfil, tipo, pai), sem diferenciar maiúsculas (RN-CAT-07).
    uniqueIndex('categories_name_unique')
      .on(
        table.profileId,
        table.type,
        sql`coalesce(${table.parentId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
        sql`lower(${table.name})`,
      )
      .where(sql`${table.deletedAt} is null`),
    // Uma "Outros" por tipo e perfil.
    uniqueIndex('categories_system_unique')
      .on(table.profileId, table.type)
      .where(sql`${table.isSystem} and ${table.deletedAt} is null`),
    index('categories_profile_idx').on(table.profileId),
    // Pull do sync: mudanças do usuário depois do cursor (RNF-SYN-03).
    index('categories_sync_idx').on(table.userId, table.serverVersion),
    ...ownerPolicies(table.userId),
  ],
).enableRLS();
