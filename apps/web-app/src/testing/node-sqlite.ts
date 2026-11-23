/// <reference types="node" />
// Roda no Vitest (Node): usa o SQLite do Node como banco local, pelo mesmo driver proxy do Worker.
import { LOCAL_MIGRATIONS, migrateLocal } from '@zooloo/db-schema/local';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

/** Banco local real (SQLite do Node, em memória) com as migrações e as FKs ligadas. */
export async function openDatabase(): Promise<SqliteRemoteDatabase> {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys = ON');
  const run = (sql: string, params: readonly unknown[] = []) => {
    database.prepare(sql).run(...(params as SQLInputValue[]));
    return Promise.resolve();
  };
  const all = (sql: string, params: readonly unknown[] = []) => {
    const statement = database.prepare(sql);
    statement.setReturnArrays(true);
    return Promise.resolve(statement.all(...(params as SQLInputValue[])) as unknown as unknown[][]);
  };
  await migrateLocal({ run, all }, LOCAL_MIGRATIONS, '2026-11-19T00:00:00.000Z');
  return drizzle(async (sql, params, method) => {
    if (method === 'run') {
      await run(sql, params);
      return { rows: [] };
    }
    const rows = await all(sql, params);
    return { rows: method === 'get' ? (rows[0] ?? []) : rows };
  });
}
