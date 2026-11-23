import sqlite3InitModule from '../../../vendor/sqlite3mc/sqlite3.mjs';

/**
 * Carrega o SQLite3 Multiple Ciphers (vendor/sqlite3mc, ADR-0008). O build oficial do SQLite3MC é
 * a variante "vanilla" do sqlite-wasm: sozinho procura o `.wasm` ao lado do script, sem o hash do
 * Vite. Aqui o Vite resolve a URL do `.wasm` (com hash e no precache do Service Worker).
 * Roda só em navegador real: coberto pelo E2E (e2e/).
 */
const WASM_URL = new URL('../../../vendor/sqlite3mc/sqlite3.wasm', import.meta.url).href;

export type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>;

/** Funções do SQLite3MC fora dos tipos do pacote oficial. */
interface CipherCapi {
  sqlite3mc_vfs_create(base: string, makeDefault: number): number;
  sqlite3mc_vfs_destroy(name: string): void;
}

export function loadSqlite3(): Promise<Sqlite3> {
  const init = sqlite3InitModule as unknown as (options: {
    locateFile(path: string): string;
  }) => Promise<Sqlite3>;
  return init({ locateFile: () => WASM_URL });
}

/** Registra a VFS de cifra por cima de uma VFS existente e devolve o nome dela. */
export function installCipherVfs(sqlite3: Sqlite3, base: string): string {
  if ((sqlite3.capi as unknown as CipherCapi).sqlite3mc_vfs_create(base, 0) !== 0) {
    throw new Error('Não foi possível ligar a cifra ao banco local.');
  }
  return `multipleciphers-${base}`;
}

export function removeCipherVfs(sqlite3: Sqlite3, name: string): void {
  (sqlite3.capi as unknown as CipherCapi).sqlite3mc_vfs_destroy(name);
}
