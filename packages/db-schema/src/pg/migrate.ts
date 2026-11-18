import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

/** Pasta das migrações versionadas; resolvida a partir de `src/pg` e de `dist/pg`. */
export const PG_MIGRATIONS_FOLDER = fileURLToPath(new URL('../../migrations/pg', import.meta.url));

/**
 * Aplica as migrações pendentes. `connectionString` precisa ser do papel dono das tabelas
 * (`zooloo_owner`), nunca do papel da aplicação (ADR-0005).
 */
export async function migratePostgres(connectionString: string): Promise<void> {
  const pool = new pg.Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: PG_MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}
