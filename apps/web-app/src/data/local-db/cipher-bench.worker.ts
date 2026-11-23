/// <reference lib="webworker" />
import { applyKey, verifyCipher } from './cipher.js';
import { toHex } from './database-key.js';
import { createFieldCipher } from './field-cipher.js';
import type { CipherBenchResult } from './protocol.js';
import { installCipherVfs, loadSqlite3, removeCipherVfs } from './sqlite3mc.js';

/**
 * Medição da PoC 3 (ADR-0008), só na página de desenvolvimento: grava e lê N linhas em um banco
 * sem cifra, em um banco cifrado (estratégia 1) e em um banco sem cifra com a coluna de texto
 * cifrada por campo (estratégia 2). Usa um pool OPFS próprio, apagado ao final; não toca o banco
 * do app. Dados sintéticos.
 */
declare const self: DedicatedWorkerGlobalScope;

const POOL = 'zooloo-bench-sahpool';

self.onmessage = async (event: MessageEvent<{ rows: number }>) => {
  const { rows } = event.data;
  const sqlite3 = await loadSqlite3();
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: POOL, initialCapacity: 6 });
  const cipherVfs = installCipherVfs(sqlite3, POOL);
  const key = crypto.getRandomValues(new Uint8Array(32));
  const fieldCipher = await createFieldCipher(key);

  async function run(
    file: string,
    vfs: string,
    encode: (text: string, id: number) => Promise<string>,
    decode: (text: string, id: number) => Promise<string>,
    keyed: boolean,
  ): Promise<number> {
    const started = performance.now();
    const db = new sqlite3.oo1.DB({ filename: file, flags: 'c', vfs });
    const query = (sql: string, bind: unknown[] = []) =>
      db.exec({ sql, bind: bind as never, rowMode: 'array', returnValue: 'resultRows' });
    if (keyed) {
      applyKey(query, toHex(key));
      verifyCipher(query);
    }
    query('CREATE TABLE notes (id INTEGER PRIMARY KEY, description TEXT NOT NULL)');
    const values: [number, string][] = [];
    for (let id = 1; id <= rows; id += 1) {
      values.push([id, await encode(`Lançamento sintético ${id} no mercado do bairro`, id)]);
    }
    query('BEGIN');
    for (const [id, description] of values) {
      query('INSERT INTO notes (id, description) VALUES (?, ?)', [id, description]);
    }
    query('COMMIT');
    const read = query('SELECT id, description FROM notes ORDER BY id') as [number, string][];
    for (const [id, description] of read) {
      await decode(description, id);
    }
    db.close();
    return Math.round(performance.now() - started);
  }

  const same = (text: string) => Promise.resolve(text);
  // Aquecimento: a primeira rodada paga a compilação do WASM e do JIT; fica fora da medição.
  await run('/warmup.sqlite3', POOL, same, same, false);
  const result: CipherBenchResult = {
    rows,
    plainMs: await run('/plain.sqlite3', POOL, same, same, false),
    databaseCipherMs: await run('/cipher.sqlite3', cipherVfs, same, same, true),
    fieldCipherMs: await run(
      '/field.sqlite3',
      POOL,
      (text, id) => fieldCipher.encrypt(text, `notes.description.${id}`),
      (text, id) => fieldCipher.decrypt(text, `notes.description.${id}`),
      false,
    ),
  };
  removeCipherVfs(sqlite3, cipherVfs);
  await pool.removeVfs();
  self.postMessage(result);
};
