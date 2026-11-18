import { eq } from 'drizzle-orm';
import { getTableConfig as getPgTableConfig } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { getTableConfig as getSqliteTableConfig } from 'drizzle-orm/sqlite-core';
import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import * as server from '../pg/index.js';
import * as local from './tables.js';

const MIGRATIONS = new URL('../../migrations/sqlite/', import.meta.url);

/** Colunas que existem só no servidor (nenhuma por enquanto). Toda exceção precisa de motivo. */
const SERVER_ONLY: Record<string, readonly string[]> = {};

/** O Drizzle embrulha o erro do SQLite ("Failed query: …"); o motivo real fica em `cause`. */
async function expectSqliteError(work: Promise<unknown>, pattern: RegExp): Promise<void> {
  const error: unknown = await work.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(Error);
  expect(String((error as Error).cause)).toMatch(pattern);
}

function columnNames(columns: readonly { name: string }[]): string[] {
  return columns.map((column) => column.name).sort();
}

function openLocalDatabase(): DatabaseSync {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys = ON');
  // Mesma ordem que o migrador do cliente: a do journal do drizzle-kit.
  const journal = JSON.parse(readFileSync(new URL('meta/_journal.json', MIGRATIONS), 'utf8')) as {
    entries: { tag: string }[];
  };
  for (const { tag } of journal.entries) {
    const source = readFileSync(new URL(`${tag}.sql`, MIGRATIONS), 'utf8');
    for (const statement of source.split('--> statement-breakpoint')) {
      database.exec(statement);
    }
  }
  return database;
}

/** Drizzle sobre `node:sqlite` pelo mesmo driver proxy que o Web Worker do PWA usa (doc 09 §4). */
function localDrizzle(database: DatabaseSync) {
  return drizzle(async (query, params, method) => {
    const statement = database.prepare(query);
    const values = params as SQLInputValue[];
    if (method === 'run') {
      statement.run(...values);
      return { rows: [] };
    }
    statement.setReturnArrays(true);
    const rows = statement.all(...values) as unknown as unknown[][];
    return { rows: method === 'get' ? (rows[0] ?? []) : rows };
  });
}

describe('paridade entre esquema local (SQLite) e servidor (PostgreSQL)', () => {
  const pairs = [
    [local.profiles, server.profiles],
    [local.categories, server.categories],
  ] as const;

  it.each(pairs)('mesmas colunas: %#', (localTable, serverTable) => {
    const localConfig = getSqliteTableConfig(localTable);
    const serverConfig = getPgTableConfig(serverTable);
    expect(localConfig.name).toBe(serverConfig.name);
    const expected = columnNames(serverConfig.columns).filter(
      (name) => !(SERVER_ONLY[serverConfig.name] ?? []).includes(name),
    );
    expect(columnNames(localConfig.columns)).toEqual(expected);
  });

  it('obrigatoriedade das colunas é a mesma', () => {
    for (const [localTable, serverTable] of pairs) {
      const required = (columns: readonly { name: string; notNull: boolean }[]) =>
        columns
          .filter((column) => column.notNull)
          .map((column) => column.name)
          .sort();
      expect(required(getSqliteTableConfig(localTable).columns)).toEqual(
        required(getPgTableConfig(serverTable).columns),
      );
    }
  });
});

describe('banco local', () => {
  const PROFILE = '0196f3a2-0000-7000-8000-0000000000a1';
  const base = {
    userId: '0196f3a2-0000-7000-8000-00000000000a',
    createdAt: '2026-11-18T13:00:00.000Z',
    updatedAt: '2026-11-18T13:00:00.000Z',
    hlc: '0000000000000:0000:test',
  };
  let database: DatabaseSync;
  let db: ReturnType<typeof localDrizzle>;

  beforeEach(async () => {
    database = openLocalDatabase();
    db = localDrizzle(database);
    await db.insert(local.profiles).values({
      ...base,
      id: PROFILE,
      name: 'Pessoal',
      currency: 'BRL',
      color: '#16B89A',
      icon: 'wallet',
    });
  });

  const category = (id: string, name: string, parentId: string | null = null) => ({
    ...base,
    id,
    profileId: PROFILE,
    type: 'expense' as const,
    name,
    parentId,
    icon: 'tag',
    color: '#142B3B',
  });

  it('a migração gerada aplica e o Drizzle grava e lê pelo driver proxy', async () => {
    await db.insert(local.categories).values(category('c1', 'Alimentação'));
    const rows = await db.select().from(local.categories).where(eq(local.categories.id, 'c1'));
    expect(rows).toEqual([
      expect.objectContaining({ name: 'Alimentação', isSystem: false, deletedAt: null }),
    ]);
    const [profile] = await db.select().from(local.profiles);
    expect(profile?.settings).toEqual({});
  });

  it('nome único por nível sem diferenciar maiúsculas, como no servidor', async () => {
    await db.insert(local.categories).values(category('c1', 'Lazer'));
    await expectSqliteError(db.insert(local.categories).values(category('c2', 'LAZER')), /UNIQUE/);
    await db.insert(local.categories).values(category('c3', 'Lazer', 'c1'));
  });

  it('chaves estrangeiras valem no banco local', async () => {
    await expectSqliteError(
      db.insert(local.categories).values({ ...category('c4', 'Órfã'), profileId: 'inexistente' }),
      /FOREIGN KEY/,
    );
  });
});
