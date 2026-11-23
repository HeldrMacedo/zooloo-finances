import { describe, expect, it } from 'vitest';
import {
  DATABASE_KEY_BYTES,
  type KeyVault,
  loadDatabaseKey,
  type StoredDatabaseKey,
  toHex,
} from './database-key.js';

class MemoryVault implements KeyVault {
  stored: StoredDatabaseKey | undefined;
  clears = 0;

  read() {
    return Promise.resolve(this.stored);
  }

  write(stored: StoredDatabaseKey) {
    this.stored = stored;
    return Promise.resolve();
  }

  clear() {
    this.clears += 1;
    this.stored = undefined;
    return Promise.resolve();
  }
}

describe('loadDatabaseKey', () => {
  it('cria chave aleatória de 256 bits e guarda só o texto cifrado com chave não exportável', async () => {
    const vault = new MemoryVault();
    const key = await loadDatabaseKey(vault);
    expect(key.created).toBe(true);
    expect(key.bytes).toHaveLength(DATABASE_KEY_BYTES);
    expect(vault.stored?.wrappingKey.extractable).toBe(false);
    expect(vault.stored?.wrappingKey.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
    const ciphertext = new Uint8Array(vault.stored?.ciphertext ?? new ArrayBuffer(0));
    // AES-GCM: 32 bytes da chave + 16 da tag; nada da chave em claro.
    expect(ciphertext).toHaveLength(DATABASE_KEY_BYTES + 16);
    expect(toHex(ciphertext)).not.toContain(toHex(key.bytes));
  });

  it('reabrir devolve a mesma chave sem recriar', async () => {
    const vault = new MemoryVault();
    const first = await loadDatabaseKey(vault);
    const second = await loadDatabaseKey(vault);
    expect(second).toEqual({ bytes: first.bytes, created: false });
    expect(vault.clears).toBe(1);
  });

  it('chave guardada adulterada ou de outro tamanho vira chave nova', async () => {
    const vault = new MemoryVault();
    const first = await loadDatabaseKey(vault);
    const stored = vault.stored;
    if (!stored) {
      throw new Error('cofre vazio');
    }
    const tampered = new Uint8Array(stored.ciphertext.slice(0));
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;
    vault.stored = { ...stored, ciphertext: tampered.buffer };
    const replaced = await loadDatabaseKey(vault);
    expect(replaced.created).toBe(true);
    expect(replaced.bytes).not.toEqual(first.bytes);

    const short = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: stored.iv,
        additionalData: new TextEncoder().encode('zooloo/local-db-key/v1'),
      },
      stored.wrappingKey,
      new Uint8Array(16),
    );
    vault.stored = { ...stored, ciphertext: short };
    expect((await loadDatabaseKey(vault)).created).toBe(true);
  });

  it('usa a aleatoriedade injetada para chave e IV', async () => {
    let calls = 0;
    const key = await loadDatabaseKey(new MemoryVault(), crypto.subtle, (bytes) => {
      calls += 1;
      return bytes.fill(calls);
    });
    expect(key.bytes).toEqual(new Uint8Array(DATABASE_KEY_BYTES).fill(1));
    expect(calls).toBe(2);
  });

  it('toHex codifica em minúsculas com dois dígitos por byte', () => {
    expect(toHex(new Uint8Array([0, 15, 255]))).toBe('000fff');
  });
});
