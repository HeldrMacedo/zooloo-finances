import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const POSTGRES_IMAGE = 'postgres:17-alpine';
const MIGRATIONS = fileURLToPath(new URL('../../migrations/pg', import.meta.url));

export interface TestDatabase {
  readonly container: StartedPostgreSqlContainer;
  /** Papel dono das tabelas, que roda as migrações (não é superusuário). */
  readonly owner: pg.Pool;
  /** Papel da aplicação, sujeito à RLS. */
  readonly app: pg.Pool;
  /** URI de conexão do papel da aplicação, para quem cria o próprio pool (ex.: a API). */
  readonly appConnectionUri: string;
  stop(): Promise<void>;
}

/**
 * Sobe PostgreSQL real com os mesmos papéis de produção: superusuário só cria papéis e banco;
 * migrações rodam como `zooloo_owner`; a aplicação conecta como `zooloo_app` (doc 10 §5).
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  const admin = new pg.Client({ connectionString: container.getConnectionUri() });
  await admin.connect();
  await admin.query(`
    create role zooloo_owner login password 'owner' nosuperuser nobypassrls;
    create role zooloo_app login password 'app' nosuperuser nobypassrls;
  `);
  await admin.query('create database zooloo owner zooloo_owner');
  await admin.end();

  const uri = (user: string, password: string): string =>
    `postgres://${user}:${password}@${container.getHost()}:${container.getPort()}/zooloo`;
  const owner = new pg.Pool({ connectionString: uri('zooloo_owner', 'owner'), max: 2 });
  const app = new pg.Pool({ connectionString: uri('zooloo_app', 'app'), max: 4 });

  await migrate(drizzle(owner), { migrationsFolder: MIGRATIONS });

  return {
    container,
    owner,
    app,
    appConnectionUri: uri('zooloo_app', 'app'),
    async stop() {
      await Promise.all([owner.end(), app.end()]);
      await container.stop();
    },
  };
}

/** Executa `work` numa transação do papel da aplicação, no contexto de `userId`. */
export async function asUser<T>(
  pool: pg.Pool,
  userId: string | null,
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    if (userId !== null) {
      await client.query(`select set_config('app.user_id', $1, true)`, [userId]);
    }
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
