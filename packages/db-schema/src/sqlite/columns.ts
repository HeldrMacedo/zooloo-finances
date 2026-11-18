import { integer, text } from 'drizzle-orm/sqlite-core';

/** Timestamp UTC em ISO 8601 (`2026-11-18T13:00:00.000Z`); o SQLite não tem tipo de data. */
export const isoTimestamp = (name: string) => text(name);

/**
 * Mesmos campos comuns do PostgreSQL (`src/pg/columns.ts`), com tipos do SQLite. A paridade de
 * nomes é verificada por teste.
 */
export const syncColumns = () => ({
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: isoTimestamp('created_at').notNull(),
  updatedAt: isoTimestamp('updated_at').notNull(),
  deletedAt: isoTimestamp('deleted_at'),
  serverVersion: integer('server_version').notNull().default(0),
  hlc: text('hlc').notNull(),
});
