import { defineConfig } from 'drizzle-kit';

// Migrações do PostgreSQL. Gerar com `pnpm db:generate`; nunca editar SQL gerado à mão.
// Grants e FORCE RLS ficam em migrações custom (`drizzle-kit generate --custom`).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/pg/index.ts',
  out: './migrations/pg',
  entities: { roles: true },
  strict: true,
  verbose: true,
});
