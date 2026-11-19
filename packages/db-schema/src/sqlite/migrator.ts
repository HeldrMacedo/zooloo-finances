/** Migração do banco local já empacotada: o cliente não lê arquivos (navegador e mobile). */
export interface LocalMigration {
  readonly tag: string;
  readonly statements: readonly string[];
}

/** Porta mínima para o banco local; implementada pelo Worker do PWA e pelo expo-sqlite. */
export interface LocalExecutor {
  run(sql: string, params?: readonly unknown[]): Promise<void>;
  all(sql: string, params?: readonly unknown[]): Promise<readonly (readonly unknown[])[]>;
}

const JOURNAL_TABLE = '__zooloo_migrations';

/**
 * Aplica, em ordem, as migrações ainda não registradas. Cada migração roda numa transação: falhou,
 * nada dela fica (RNF-QA-07). Devolve as tags aplicadas agora.
 */
export async function migrateLocal(
  db: LocalExecutor,
  migrations: readonly LocalMigration[],
  appliedAt: string,
): Promise<string[]> {
  await db.run(
    `CREATE TABLE IF NOT EXISTS ${JOURNAL_TABLE} (tag TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL)`,
  );
  const rows = await db.all(`SELECT tag FROM ${JOURNAL_TABLE}`);
  const done = new Set(rows.map((row) => String(row[0])));
  const applied: string[] = [];
  for (const migration of migrations) {
    if (done.has(migration.tag)) {
      continue;
    }
    await db.run('BEGIN');
    try {
      for (const statement of migration.statements) {
        await db.run(statement);
      }
      await db.run(`INSERT INTO ${JOURNAL_TABLE} (tag, applied_at) VALUES (?, ?)`, [
        migration.tag,
        appliedAt,
      ]);
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
    applied.push(migration.tag);
  }
  return applied;
}
