/// <reference lib="webworker" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { LOCAL_MIGRATIONS, migrateLocal } from '@zooloo/db-schema/local';
import { nowIso } from '../clock.js';
import type { QueryRequest, WorkerRequest, WorkerResponse } from './protocol.js';

/**
 * Web Worker dedicado da aba líder: abre o SQLite WASM oficial no VFS `opfs-sahpool` (doc 09 §4).
 * Esse VFS dispensa COOP/COEP e SharedArrayBuffer, mas só aceita uma conexão por origem; por isso
 * existe a eleição de líder em `coordinator.ts`. Testado ponta a ponta pelo Playwright (e2e/).
 */
declare const self: DedicatedWorkerGlobalScope;

const FILE = '/zooloo.sqlite3';
const VFS_NAME = 'zooloo-sahpool';

const reply = (message: WorkerResponse): void => {
  self.postMessage(message);
};

async function open() {
  const sqlite3 = await sqlite3InitModule();
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: VFS_NAME, initialCapacity: 6 });
  const db = new pool.OpfsSAHPoolDb(FILE);
  db.exec('PRAGMA foreign_keys = ON');
  const all = (sql: string, params: readonly unknown[] = []): unknown[][] =>
    db.exec({
      sql,
      bind: params as never,
      rowMode: 'array',
      returnValue: 'resultRows',
    }) as unknown[][];
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
  return { db, pool, all, migrated };
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
    reply({ kind: 'ready', storage: { vfs: VFS_NAME, file: FILE, migrated: state.migrated } });
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
