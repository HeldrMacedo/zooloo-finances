import { writeFileSync } from 'node:fs';
import { readLocalMigrations, renderMigrationsModule } from '../src/sqlite/bundle-migrations.ts';

// Embute as migrações SQLite num módulo TS para o cliente (PWA/mobile), que não lê arquivos.
const folder = new URL('../migrations/sqlite/', import.meta.url);
const target = new URL('../src/sqlite/migrations.generated.ts', import.meta.url);
writeFileSync(target, renderMigrationsModule(readLocalMigrations(folder)));
