import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { readLocalMigrations, renderMigrationsModule } from './bundle-migrations.js';
import { type LocalExecutor, type LocalMigration, migrateLocal } from './migrator.js';
import { LOCAL_MIGRATIONS } from './migrations.generated.js';

const FOLDER = new URL('../../migrations/sqlite/', import.meta.url);
const NOW = '2026-11-19T12:00:00.000Z';

function executor(database: DatabaseSync): LocalExecutor {
  return {
    run: async (sql, params = []) => {
      database.prepare(sql).run(...(params as SQLInputValue[]));
    },
    all: async (sql, params = []) => {
      const statement = database.prepare(sql);
      statement.setReturnArrays(true);
      return statement.all(...(params as SQLInputValue[])) as unknown as unknown[][];
    },
  };
}

const tables = (database: DatabaseSync): string[] =>
  (
    database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as {
      name: string;
    }[]
  ).map((row) => row.name);

describe('migrações locais empacotadas', () => {
  it('o módulo gerado está em dia com os arquivos SQL (rode db:generate)', () => {
    expect(LOCAL_MIGRATIONS).toEqual(readLocalMigrations(FOLDER));
  });

  it('renderMigrationsModule produz módulo com os dados', () => {
    const text = renderMigrationsModule([{ tag: 't', statements: ['SELECT 1'] }]);
    expect(text).toContain('export const LOCAL_MIGRATIONS');
    expect(text).toContain('"SELECT 1"');
  });

  it('cada migração tem ao menos um comando e tags em ordem', () => {
    expect(LOCAL_MIGRATIONS.length).toBeGreaterThan(0);
    for (const migration of LOCAL_MIGRATIONS) {
      expect(migration.statements.length).toBeGreaterThan(0);
    }
    const tags = LOCAL_MIGRATIONS.map((migration) => migration.tag);
    expect([...tags].sort()).toEqual(tags);
  });
});

describe('migrateLocal', () => {
  it('aplica tudo num banco novo e registra cada tag', async () => {
    const database = new DatabaseSync(':memory:');
    const applied = await migrateLocal(executor(database), LOCAL_MIGRATIONS, NOW);
    expect(applied).toEqual(LOCAL_MIGRATIONS.map((migration) => migration.tag));
    expect(tables(database)).toEqual(
      expect.arrayContaining(['__zooloo_migrations', 'categories', 'profiles']),
    );
  });

  it('é idempotente: segunda execução não aplica nada', async () => {
    const database = new DatabaseSync(':memory:');
    await migrateLocal(executor(database), LOCAL_MIGRATIONS, NOW);
    expect(await migrateLocal(executor(database), LOCAL_MIGRATIONS, NOW)).toEqual([]);
  });

  it('aplica só as novas quando o app atualiza', async () => {
    const database = new DatabaseSync(':memory:');
    const [first, ...rest] = LOCAL_MIGRATIONS;
    await migrateLocal(executor(database), first ? [first] : [], NOW);
    expect(await migrateLocal(executor(database), LOCAL_MIGRATIONS, NOW)).toEqual(
      rest.map((migration) => migration.tag),
    );
  });

  it('migração com erro é desfeita por inteiro e não fica registrada', async () => {
    const database = new DatabaseSync(':memory:');
    const broken: LocalMigration = {
      tag: '9999_quebrada',
      statements: ['CREATE TABLE parcial (id INTEGER)', 'ISTO NÃO É SQL'],
    };
    await expect(migrateLocal(executor(database), [broken], NOW)).rejects.toThrow();
    expect(tables(database)).not.toContain('parcial');
    expect(await migrateLocal(executor(database), [], NOW)).toEqual([]);
    const journal = database.prepare('SELECT count(*) AS n FROM __zooloo_migrations').get();
    expect(journal).toEqual({ n: 0 });
  });
});
