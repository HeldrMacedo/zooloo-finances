/** Banco local do cliente (PWA e mobile): tabelas, migrações embutidas e executor. Sem I/O de Node. */
export * from './sqlite/tables.js';
export { type LocalExecutor, type LocalMigration, migrateLocal } from './sqlite/migrator.js';
export { LOCAL_MIGRATIONS } from './sqlite/migrations.generated.js';
