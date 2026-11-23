import { is } from 'drizzle-orm';
import { getTableConfig, PgDialect, PgTable } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, startTestDatabase, type TestDatabase } from '../testing/postgres.js';
import * as schema from './index.js';
import { userContext } from './session.js';

const USER_A = '0196f3a2-0000-7000-8000-00000000000a';
const USER_B = '0196f3a2-0000-7000-8000-00000000000b';
const PROFILE_A = '0196f3a2-0000-7000-8000-0000000000a1';
const PROFILE_B = '0196f3a2-0000-7000-8000-0000000000b1';
const HLC = '0000000000000:0000:test';

const tableNames = Object.values(schema)
  .filter((value) => is(value, PgTable))
  .map((table) => getTableConfig(table as PgTable).name)
  .sort();

let db: TestDatabase;

async function seedUser(userId: string, profileId: string, email: string): Promise<void> {
  await asUser(db.app, userId, async (client) => {
    await client.query(
      `insert into users (id, email, name, wrapped_dek) values ($1, $2, 'Teste', '\\x00')`,
      [userId, email],
    );
    await client.query(
      `insert into profiles (id, user_id, hlc, name, currency, color, icon)
       values ($1, $2, $3, 'Pessoal', 'BRL', '#16B89A', 'wallet')`,
      [profileId, userId, HLC],
    );
  });
}

function insertCategory(
  client: { query: (text: string, values: unknown[]) => Promise<unknown> },
  values: { id: string; user: string; profile: string; name: string; parent?: string },
): Promise<unknown> {
  return client.query(
    `insert into categories (id, user_id, hlc, profile_id, type, name, parent_id, icon, color)
     values ($1, $2, $3, $4, 'expense', $5, $6, 'tag', '#142B3B')`,
    [values.id, values.user, HLC, values.profile, values.name, values.parent ?? null],
  );
}

beforeAll(async () => {
  db = await startTestDatabase();
  await seedUser(USER_A, PROFILE_A, 'ana@example.com');
  await seedUser(USER_B, PROFILE_B, 'bia@example.com');
}, 180_000);

afterAll(async () => {
  await db?.stop();
});

describe('estrutura: toda tabela de dados do usuário tem RLS (doc 12 §5.2)', () => {
  it('o esquema Drizzle declara as tabelas esperadas', () => {
    expect(tableNames).toEqual(['categories', 'profiles', 'sync_state', 'users']);
  });

  it('as migrações criam exatamente as tabelas do esquema', async () => {
    const { rows } = await db.owner.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in ('r', 'p') order by 1`,
    );
    expect(rows.map((row) => row.relname)).toEqual(tableNames);
  });

  it('toda tabela tem RLS ativa e forçada, grants da aplicação e política por comando', async () => {
    const { rows } = await db.owner.query<{
      relname: string;
      enabled: boolean;
      forced: boolean;
      commands: string[];
      can_write: boolean;
    }>(
      `select c.relname,
              c.relrowsecurity as enabled,
              c.relforcerowsecurity as forced,
              coalesce(array_agg(distinct p.cmd::text) filter (where p.cmd is not null), '{}') as commands,
              has_table_privilege('zooloo_app', c.oid, 'select, insert, update, delete') as can_write
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
        where n.nspname = 'public' and c.relkind in ('r', 'p')
        group by c.relname, c.relrowsecurity, c.relforcerowsecurity, c.oid`,
    );
    for (const row of rows) {
      expect(row, `tabela ${row.relname}`).toMatchObject({
        enabled: true,
        forced: true,
        can_write: true,
      });
      expect([...row.commands].sort(), `políticas de ${row.relname}`).toEqual([
        'DELETE',
        'INSERT',
        'SELECT',
        'UPDATE',
      ]);
    }
  });

  it('toda política vale só para zooloo_app e compara com app.user_id', async () => {
    const { rows } = await db.owner.query<{ tablename: string; roles: string[]; expr: string }>(
      `select tablename, roles::text[] as roles, coalesce(qual, with_check) as expr
         from pg_policies where schemaname = 'public'`,
    );
    expect(rows.length).toBe(tableNames.length * 4);
    for (const row of rows) {
      expect(row.roles, row.tablename).toEqual(['zooloo_app']);
      expect(row.expr, row.tablename).toContain("current_setting('app.user_id'::text, true)");
    }
  });

  it('o papel da aplicação não é dono, superusuário nem ignora RLS', async () => {
    const { rows } = await db.owner.query<{
      rolsuper: boolean;
      rolbypassrls: boolean;
      owns: number;
    }>(
      `select r.rolsuper, r.rolbypassrls,
              (select count(*)::int from pg_class c where c.relowner = r.oid) as owns
         from pg_roles r where r.rolname = 'zooloo_app'`,
    );
    expect(rows[0]).toEqual({ rolsuper: false, rolbypassrls: false, owns: 0 });
  });

  it('a aplicação não executa DDL', async () => {
    await expect(db.app.query('create table intruso (id int)')).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('isolamento entre usuários (SEC-AZ, F7 IDOR)', () => {
  it('sem contexto de usuário nenhuma linha é visível', async () => {
    const counts = await asUser(db.app, null, async (client) => {
      const users = await client.query('select 1 from users');
      const profiles = await client.query('select 1 from profiles');
      return [users.rowCount, profiles.rowCount];
    });
    expect(counts).toEqual([0, 0]);
  });

  it('cada usuário vê só as próprias linhas', async () => {
    const seen = await asUser(db.app, USER_A, async (client) => {
      const { rows } = await client.query<{ id: string }>('select id from profiles');
      return rows.map((row) => row.id);
    });
    expect(seen).toEqual([PROFILE_A]);
  });

  it('buscar recurso de outro usuário pelo ID não retorna nada', async () => {
    const rows = await asUser(db.app, USER_A, async (client) => {
      const result = await client.query('select * from profiles where id = $1', [PROFILE_B]);
      return result.rowCount;
    });
    expect(rows).toBe(0);
  });

  it('não grava linha em nome de outro usuário', async () => {
    await expect(
      asUser(db.app, USER_A, (client) =>
        client.query(
          `insert into profiles (id, user_id, hlc, name, currency, color, icon)
           values ('0196f3a2-0000-7000-8000-0000000000a9', $1, $2, 'X', 'BRL', '#000000', 'x')`,
          [USER_B, HLC],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('update e delete de linha alheia não afetam nada', async () => {
    const affected = await asUser(db.app, USER_A, async (client) => {
      const update = await client.query(`update profiles set name = 'hack' where id = $1`, [
        PROFILE_B,
      ]);
      const remove = await client.query('delete from profiles where id = $1', [PROFILE_B]);
      return [update.rowCount, remove.rowCount];
    });
    expect(affected).toEqual([0, 0]);
  });

  it('não move a própria linha para outro usuário', async () => {
    await expect(
      asUser(db.app, USER_A, (client) =>
        client.query('update profiles set user_id = $1 where id = $2', [USER_B, PROFILE_A]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('não referencia perfil de outro usuário mesmo com o próprio user_id (FK composta)', async () => {
    await expect(
      asUser(db.app, USER_A, (client) =>
        insertCategory(client, {
          id: '0196f3a2-0000-7000-8000-0000000000c1',
          user: USER_A,
          profile: PROFILE_B,
          name: 'Invasão',
        }),
      ),
    ).rejects.toThrow(/categories_profile_fk/);
  });

  it('o contexto do usuário não sobrevive ao fim da transação (pool compartilhado)', async () => {
    const client = await db.app.connect();
    try {
      await client.query('begin');
      await client.query(new PgDialect().sqlToQuery(userContext(USER_A)).sql, [USER_A]);
      await client.query('commit');
      const { rowCount } = await client.query('select 1 from profiles');
      expect(rowCount).toBe(0);
    } finally {
      client.release();
    }
  });
});

describe('integridade de categorias (RN-CAT-01, 03, 07)', () => {
  const FOOD = '0196f3a2-0000-7000-8000-0000000000d1';

  beforeAll(async () => {
    await asUser(db.app, USER_A, (client) =>
      insertCategory(client, { id: FOOD, user: USER_A, profile: PROFILE_A, name: 'Alimentação' }),
    );
  });

  it('nome repetido no mesmo nível é recusado sem diferenciar maiúsculas', async () => {
    await expect(
      asUser(db.app, USER_A, (client) =>
        insertCategory(client, {
          id: '0196f3a2-0000-7000-8000-0000000000d2',
          user: USER_A,
          profile: PROFILE_A,
          name: 'ALIMENTAÇÃO',
        }),
      ),
    ).rejects.toThrow(/categories_name_unique/);
  });

  it('o mesmo nome é aceito como subcategoria e em outro usuário', async () => {
    await asUser(db.app, USER_A, (client) =>
      insertCategory(client, {
        id: '0196f3a2-0000-7000-8000-0000000000d3',
        user: USER_A,
        profile: PROFILE_A,
        name: 'Alimentação',
        parent: FOOD,
      }),
    );
    await asUser(db.app, USER_B, (client) =>
      insertCategory(client, {
        id: '0196f3a2-0000-7000-8000-0000000000d4',
        user: USER_B,
        profile: PROFILE_B,
        name: 'Alimentação',
      }),
    );
  });

  it('nome de categoria excluída (tombstone) pode ser reutilizado', async () => {
    await asUser(db.app, USER_A, async (client) => {
      await insertCategory(client, {
        id: '0196f3a2-0000-7000-8000-0000000000d5',
        user: USER_A,
        profile: PROFILE_A,
        name: 'Lazer',
      });
      await client.query(`update categories set deleted_at = now() where id = $1`, [
        '0196f3a2-0000-7000-8000-0000000000d5',
      ]);
      await insertCategory(client, {
        id: '0196f3a2-0000-7000-8000-0000000000d6',
        user: USER_A,
        profile: PROFILE_A,
        name: 'lazer',
      });
    });
  });

  it('pai precisa ser do mesmo perfil e não pode ser a própria categoria', async () => {
    await expect(
      asUser(db.app, USER_B, (client) =>
        insertCategory(client, {
          id: '0196f3a2-0000-7000-8000-0000000000d7',
          user: USER_B,
          profile: PROFILE_B,
          name: 'Filha',
          parent: FOOD,
        }),
      ),
    ).rejects.toThrow(/categories_parent_fk/);
    await expect(
      asUser(db.app, USER_A, (client) =>
        client.query(`update categories set parent_id = id where id = $1`, [FOOD]),
      ),
    ).rejects.toThrow(/categories_parent_fk|categories_not_own_parent/);
  });

  it('só uma categoria de sistema "Outros" por tipo e perfil', async () => {
    const insertSystem = (id: string, name: string) =>
      asUser(db.app, USER_A, (client) =>
        client.query(
          `insert into categories (id, user_id, hlc, profile_id, type, name, icon, color, is_system)
           values ($1, $2, $3, $4, 'income', $5, 'circle-ellipsis', '#5B6B77', true)`,
          [id, USER_A, HLC, PROFILE_A, name],
        ),
      );
    await insertSystem('0196f3a2-0000-7000-8000-0000000000e1', 'Outros');
    await expect(insertSystem('0196f3a2-0000-7000-8000-0000000000e2', 'Outros 2')).rejects.toThrow(
      /categories_system_unique/,
    );
  });
});

describe('versão de sync (RNF-SYN-03)', () => {
  it('cada usuário só lê e incrementa a própria versão; sem DELETE para a aplicação', async () => {
    const bump = (userId: string) =>
      asUser(db.app, userId, async (client) => {
        const { rows } = await client.query<{ version: string }>(
          `insert into sync_state (user_id, version) values ($1, 1)
           on conflict (user_id) do update set version = sync_state.version + 1
           returning version`,
          [userId],
        );
        return Number(rows[0]?.version);
      });
    expect(await bump(USER_A)).toBe(1);
    expect(await bump(USER_A)).toBe(2);
    expect(await bump(USER_B)).toBe(1);
    const visible = await asUser(db.app, USER_A, (client) =>
      client.query('select user_id from sync_state'),
    );
    expect(visible.rows).toEqual([{ user_id: USER_A }]);
    await expect(
      asUser(db.app, USER_A, (client) => client.query('delete from sync_state')),
    ).rejects.toThrow(/permission denied/);
  });

  it('field_hlc começa vazio e guarda o HLC por campo', async () => {
    const { rows } = await asUser(db.app, USER_A, (client) =>
      client.query<{ field_hlc: unknown }>('select field_hlc from profiles'),
    );
    expect(rows).toEqual([{ field_hlc: {} }]);
  });
});

describe('usuários', () => {
  it('e-mail é único sem diferenciar maiúsculas', async () => {
    const other = '0196f3a2-0000-7000-8000-00000000000c';
    await expect(
      asUser(db.app, other, (client) =>
        client.query(
          `insert into users (id, email, name, wrapped_dek) values ($1, 'ANA@example.com', 'X', '\\x00')`,
          [other],
        ),
      ),
    ).rejects.toThrow(/users_email_unique/);
  });

  it('moeda do perfil precisa ser ISO 4217', async () => {
    await expect(
      asUser(db.app, USER_A, (client) =>
        client.query(
          `insert into profiles (id, user_id, hlc, name, currency, color, icon)
           values ('0196f3a2-0000-7000-8000-0000000000a8', $1, $2, 'X', 'brl', '#000000', 'x')`,
          [USER_A, HLC],
        ),
      ),
    ).rejects.toThrow(/profiles_currency_iso/);
  });
});
