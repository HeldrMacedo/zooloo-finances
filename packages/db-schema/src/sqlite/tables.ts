import { foreignKey, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { isoTimestamp, syncColumns } from './columns.js';

/**
 * Banco local do cliente (PWA e, na Fase 2, mobile). Contém só dados do usuário logado; o
 * isolamento é a sessão, não RLS. Tabelas espelham `src/pg` (doc 09 §2.1).
 */
export const profiles = sqliteTable('profiles', {
  ...syncColumns(),
  name: text('name').notNull(),
  currency: text('currency').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  archivedAt: isoTimestamp('archived_at'),
  sortOrder: integer('sort_order').notNull().default(0),
  settings: text('settings', { mode: 'json' }).notNull().default({}),
});

export const categories = sqliteTable(
  'categories',
  {
    ...syncColumns(),
    profileId: text('profile_id').notNull(),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    name: text('name').notNull(),
    parentId: text('parent_id'),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
    archivedAt: isoTimestamp('archived_at'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    foreignKey({
      name: 'categories_profile_fk',
      columns: [table.profileId],
      foreignColumns: [profiles.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'categories_parent_fk',
      columns: [table.parentId],
      foreignColumns: [table.id],
    }),
    // categories_name_unique (índice de expressão) fica na migração custom 0001: o drizzle-kit
    // 0.31 quebra a expressão na vírgula ao gerar SQL do SQLite (TD-005).
    index('categories_profile_idx').on(table.profileId),
  ],
);

/**
 * Fila de mutações locais ainda não enviadas ao servidor (outbox, doc 07 §4A). Só existe no
 * cliente; `seq` preserva a ordem em que foram feitas.
 */
export const syncOutbox = sqliteTable('sync_outbox', {
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  entity: text('entity').notNull(),
  recordId: text('record_id').notNull(),
  op: text('op', { enum: ['upsert', 'delete'] }).notNull(),
  fields: text('fields', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  hlc: text('hlc').notNull(),
});

/** Estado do sync no cliente: cursor do pull, último HLC e identificador do dispositivo. */
export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
