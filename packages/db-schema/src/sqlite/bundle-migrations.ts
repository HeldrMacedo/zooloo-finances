import { readFileSync } from 'node:fs';
import type { LocalMigration } from './migrator.js';

/** Lê as migrações SQLite geradas pelo drizzle-kit na ordem do journal. Só em Node (build). */
export function readLocalMigrations(folder: URL): LocalMigration[] {
  const journal = JSON.parse(readFileSync(new URL('meta/_journal.json', folder), 'utf8')) as {
    entries: { tag: string }[];
  };
  return journal.entries.map(({ tag }) => ({
    tag,
    statements: readFileSync(new URL(`${tag}.sql`, folder), 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter((statement) => statement !== ''),
  }));
}

/** Módulo TypeScript com as migrações embutidas, versionado em `migrations.generated.ts`. */
export function renderMigrationsModule(migrations: readonly LocalMigration[]): string {
  return [
    '// Gerado por `pnpm --filter @zooloo/db-schema db:generate`. Não edite à mão.',
    "import type { LocalMigration } from './migrator.js';",
    '',
    `export const LOCAL_MIGRATIONS: readonly LocalMigration[] = ${JSON.stringify(migrations, null, 2)};`,
    '',
  ].join('\n');
}
