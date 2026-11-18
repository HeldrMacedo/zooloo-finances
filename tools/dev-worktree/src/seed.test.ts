import { asUser, startTestDatabase, type TestDatabase } from '@zooloo/db-schema/testing';
import { CategoryCreateSchema, IdSchema } from '@zooloo/validation';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SEED_USERS } from './seed-data.js';
import { seedDatabase } from './seed.js';

describe('dados sintéticos', () => {
  const allIds = SEED_USERS.flatMap((user) => [
    user.id,
    user.profile.id,
    ...user.categories.map((category) => category.id),
  ]);

  it('todos os IDs são UUIDv7 válidos e únicos', () => {
    for (const id of allIds) {
      expect(IdSchema.safeParse(id).success, id).toBe(true);
    }
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('só e-mails do domínio reservado .test (doc 12 §9: nada de dado real)', () => {
    for (const user of SEED_USERS) {
      expect(user.email).toMatch(/@zooloo\.test$/);
    }
  });

  it('cada categoria passa no mesmo schema que a API usa', () => {
    for (const user of SEED_USERS) {
      for (const category of user.categories) {
        const input = {
          id: category.id,
          type: category.type,
          name: category.name,
          parentId: category.parentId,
          icon: category.icon,
          color: category.color,
        };
        expect(CategoryCreateSchema.safeParse(input).success, category.name).toBe(true);
      }
    }
  });

  it('subcategorias apontam para pais do mesmo usuário', () => {
    for (const user of SEED_USERS) {
      const ids = new Set(user.categories.map((category) => category.id));
      for (const category of user.categories.filter((c) => c.parentId !== null)) {
        expect(ids.has(category.parentId ?? '')).toBe(true);
      }
    }
  });
});

describe('seedDatabase contra PostgreSQL real', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await startTestDatabase();
  });

  afterAll(async () => {
    await db?.stop();
  });

  it('grava pelo papel da aplicação, respeitando a RLS, e é idempotente', async () => {
    expect(await seedDatabase(db.appConnectionUri)).toBe(SEED_USERS.length);
    expect(await seedDatabase(db.appConnectionUri)).toBe(SEED_USERS.length);

    const [ana, bruno] = SEED_USERS;
    const seen = await asUser(db.app, ana?.id ?? null, async (client) => {
      const users = await client.query<{ email: string }>('select email from users');
      const categories = await client.query('select 1 from categories');
      return { emails: users.rows.map((row) => row.email), categories: categories.rowCount };
    });
    expect(seen).toEqual({ emails: [ana?.email], categories: ana?.categories.length });

    // Com FORCE RLS nem o dono das tabelas enxerga linhas: conferimos pelo outro usuário.
    const brunoCategories = await asUser(db.app, bruno?.id ?? null, async (client) => {
      const result = await client.query('select 1 from categories');
      return result.rowCount;
    });
    expect(brunoCategories).toBe(bruno?.categories.length);
  });

  it('falha sem gravar nada quando o banco não tem o esquema (transação desfeita)', async () => {
    const withoutSchema = db.appConnectionUri.replace(/\/zooloo$/, '/postgres');
    await expect(seedDatabase(withoutSchema)).rejects.toThrow(/relation "users" does not exist/);
  });
});
