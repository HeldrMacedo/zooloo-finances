/// <reference lib="webworker" />
import { LOCAL_MIGRATIONS, migrateLocal } from '@zooloo/db-schema/local';
import { nowIso } from '../clock.js';
import { applyKey, isNotADatabase, verifyCipher } from './cipher.js';
import { loadDatabaseKey, toHex } from './database-key.js';
import { indexedDbKeyVault } from './indexeddb-key-vault.js';
import type { QueryRequest, WorkerRequest, WorkerResponse } from './protocol.js';
import { installCipherVfs, loadSqlite3, type Sqlite3 } from './sqlite3mc.js';

/**
 * Web Worker dedicado da aba líder: abre o SQLite WASM com cifra (SQLite3 Multiple Ciphers,
 * ADR-0008) no VFS `opfs-sahpool` (doc 09 §4). Esse VFS dispensa COOP/COEP e SharedArrayBuffer,
 * mas só aceita uma conexão por origem; por isso existe a eleição de líder em `coordinator.ts`.
 * A cifra entra como VFS por cima do pool (`multipleciphers-<pool>`). Testado pelo Playwright (e2e/).
 */
declare const self: DedicatedWorkerGlobalScope;

const FILE = '/zooloo.sqlite3';
const VFS_NAME = 'zooloo-sahpool';

const reply = (message: WorkerResponse): void => {
  self.postMessage(message);
};

/** Abre o arquivo pela VFS de cifra e confere a cifra antes de qualquer uso. */
function openEncrypted(sqlite3: Sqlite3, vfs: string, hexKey: string) {
  const db = new sqlite3.oo1.DB({ filename: FILE, flags: 'c', vfs });
  const all = (sql: string, params: readonly unknown[] = []): unknown[][] =>
    db.exec({
      sql,
      bind: params as never,
      rowMode: 'array',
      returnValue: 'resultRows',
    }) as unknown[][];
  try {
    applyKey(all, hexKey);
    const cipher = verifyCipher(all);
    return { db, all, cipher };
  } catch (error) {
    db.close();
    throw error;
  }
}

async function open() {
  const sqlite3 = await loadSqlite3();
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: VFS_NAME, initialCapacity: 6 });
  const vfs = installCipherVfs(sqlite3, VFS_NAME);
  const key = await loadDatabaseKey(indexedDbKeyVault);
  // Sem chave utilizável, o arquivo antigo (inclusive o da PoC 1, em claro) não abre: recria.
  let recreated = key.created && pool.getFileCount() > 0;
  if (recreated) {
    await pool.wipeFiles();
  }
  const hexKey = toHex(key.bytes);
  let opened;
  try {
    opened = openEncrypted(sqlite3, vfs, hexKey);
  } catch (error) {
    if (!isNotADatabase(error)) {
      throw error;
    }
    await pool.wipeFiles();
    recreated = true;
    opened = openEncrypted(sqlite3, vfs, hexKey);
  }
  const { db, all, cipher } = opened;
  all('PRAGMA foreign_keys = ON');
  const migrated = await migrateLocal(
    {
      run: async (sql, params) => {
        all(sql, params);
      },
      all: async (sql, params) => all(sql, params),
    },
    LOCAL_MIGRATIONS,
    // Timestamp técnico de auditoria da migração, não data de negócio.
    nowIso(),
  );
  return { db, pool, all, migrated, cipher, recreated };
}

function execute(
  all: (sql: string, params: readonly unknown[]) => unknown[][],
  request: QueryRequest,
) {
  const rows = all(request.sql, request.params);
  if (request.method === 'run') {
    return { rows: [] };
  }
  return { rows: request.method === 'get' ? (rows[0] ?? []) : rows };
}

const ready = open().then(
  (state) => {
    reply({
      kind: 'ready',
      storage: {
        vfs: VFS_NAME,
        file: FILE,
        migrated: state.migrated,
        cipher: state.cipher,
        recreated: state.recreated,
      },
    });
    return state;
  },
  (error: unknown) => {
    reply({ kind: 'failed', error: error instanceof Error ? error.message : String(error) });
    return null;
  },
);

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const state = await ready;
  const message = event.data;
  if (!state) {
    return;
  }
  try {
    if (message.kind === 'wipe') {
      state.db.close();
      await state.pool.wipeFiles();
      // Logout e remote wipe: a chave some junto, então nem uma cópia antiga do arquivo abre.
      await indexedDbKeyVault.clear();
      reply({ kind: 'result', id: message.id, result: { rows: [] } });
      return;
    }
    reply({ kind: 'result', id: message.id, result: execute(state.all, message) });
  } catch (error) {
    reply({
      kind: 'error',
      id: message.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
