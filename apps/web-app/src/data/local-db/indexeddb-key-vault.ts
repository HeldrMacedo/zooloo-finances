import type { KeyVault, StoredDatabaseKey } from './database-key.js';

/**
 * Cofre da chave do banco no IndexedDB. A `CryptoKey` não exportável é guardada por *structured
 * clone*: o navegador a mantém utilizável, mas nem o próprio app consegue ler os bytes dela.
 * Roda só em navegador real: coberto pelo E2E (e2e/).
 */
const DATABASE = 'zooloo-keys';
const STORE = 'keys';
const RECORD = 'local-db';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB indisponível.'));
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result as T);
      transaction.onerror = () => reject(transaction.error ?? new Error('Falha no IndexedDB.'));
    });
  } finally {
    database.close();
  }
}

export const indexedDbKeyVault: KeyVault = {
  read: () => transact<StoredDatabaseKey | undefined>('readonly', (store) => store.get(RECORD)),
  write: async (stored) => {
    await transact('readwrite', (store) => store.put(stored, RECORD));
  },
  clear: async () => {
    await transact('readwrite', (store) => store.delete(RECORD));
  },
};
