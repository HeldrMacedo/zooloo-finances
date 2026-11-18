import { defineConfig } from 'drizzle-kit';

// Migrações do banco local (SQLite WASM no PWA). Gerar com `pnpm db:generate`.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/sqlite/tables.ts',
  out: './migrations/sqlite',
  strict: true,
  verbose: true,
});
