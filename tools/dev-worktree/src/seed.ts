import pg from 'pg';
import { LEGACY_SEED_HLC, SEED_HLC, SEED_USERS, SEED_VERSION, type SeedUser } from './seed-data.js';

/** DEK fictícia: o seed não cifra nada; a criptografia real chega com o módulo de conta (SEC-CR). */
const FAKE_WRAPPED_DEK = Buffer.from('seed-only');

async function seedUser(client: pg.PoolClient, user: SeedUser): Promise<void> {
  await client.query(
    `insert into users (id, email, name, wrapped_dek) values ($1, $2, $3, $4)
     on conflict (id) do nothing`,
    [user.id, user.email, user.name, FAKE_WRAPPED_DEK],
  );
  await client.query(
    `insert into sync_state (user_id, version) values ($1, $2) on conflict (user_id) do nothing`,
    [user.id, SEED_VERSION],
  );
  await client.query(
    `insert into profiles (id, user_id, hlc, server_version, name, currency, color, icon)
     values ($1, $2, $3, $4, $5, $6, '#2D6E85', 'wallet')
     on conflict (id) do nothing`,
    [user.profile.id, user.id, SEED_HLC, SEED_VERSION, user.profile.name, user.profile.currency],
  );
  // Bancos criados antes do sync: põe as linhas do seed no formato atual sem apagar nada.
  for (const table of ['profiles', 'categories']) {
    await client.query(
      `update ${table} set hlc = $1, server_version = $2 where hlc = $3 and user_id = $4`,
      [SEED_HLC, SEED_VERSION, LEGACY_SEED_HLC, user.id],
    );
  }
  // Pais antes dos filhos: a FK do pai é verificada a cada linha.
  const ordered = [...user.categories].sort(
    (a, b) => Number(a.parentId !== null) - Number(b.parentId !== null),
  );
  for (const category of ordered) {
    await client.query(
      `insert into categories
         (id, user_id, hlc, server_version, profile_id, type, name, parent_id, icon, color,
          is_system)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (id) do nothing`,
      [
        category.id,
        user.id,
        SEED_HLC,
        SEED_VERSION,
        user.profile.id,
        category.type,
        category.name,
        category.parentId,
        category.icon,
        category.color,
        category.isSystem,
      ],
    );
  }
}

/**
 * Grava os dados sintéticos pelo papel da aplicação, no contexto RLS de cada usuário: o seed
 * passa pelas mesmas políticas que a API. Idempotente.
 */
export async function seedDatabase(appConnectionUri: string): Promise<number> {
  const pool = new pg.Pool({ connectionString: appConnectionUri, max: 1 });
  try {
    for (const user of SEED_USERS) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(`select set_config('app.user_id', $1, true)`, [user.id]);
        await seedUser(client, user);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    }
    return SEED_USERS.length;
  } finally {
    await pool.end();
  }
}
