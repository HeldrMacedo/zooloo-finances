/**
 * Chave do banco local (SEC-CR-08, RNF-PWA-05): 256 bits aleatórios, guardados só cifrados por uma
 * chave AES-GCM **não exportável** do Web Crypto. A chave não exportável e o texto cifrado ficam no
 * IndexedDB; quem copia os arquivos do perfil não consegue usar a chave fora deste navegador.
 * Protege contra cópia de arquivos e outro usuário do SO, não contra malware na sessão.
 */
export interface StoredDatabaseKey {
  readonly wrappingKey: CryptoKey;
  readonly iv: Uint8Array<ArrayBuffer>;
  readonly ciphertext: ArrayBuffer;
}

/** Onde a chave cifrada mora; no navegador, o IndexedDB (`indexeddb-key-vault.ts`). */
export interface KeyVault {
  read(): Promise<StoredDatabaseKey | undefined>;
  write(stored: StoredDatabaseKey): Promise<void>;
  clear(): Promise<void>;
}

export const DATABASE_KEY_BYTES = 32;
/** Liga o texto cifrado ao seu propósito: o mesmo blob não serve como outra chave do app. */
const ADDITIONAL_DATA = new TextEncoder().encode('zooloo/local-db-key/v1');

export interface DatabaseKey {
  readonly bytes: Uint8Array<ArrayBuffer>;
  /** `true` quando não havia chave utilizável: o banco antigo, se existir, não abre e é recriado. */
  readonly created: boolean;
}

/** Devolve a chave do banco, criando uma nova se não houver ou se a guardada não decifrar. */
export async function loadDatabaseKey(
  vault: KeyVault,
  subtle: SubtleCrypto = crypto.subtle,
  random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer> = (bytes) =>
    crypto.getRandomValues(bytes),
): Promise<DatabaseKey> {
  const stored = await vault.read();
  if (stored) {
    try {
      const plain = await subtle.decrypt(
        { name: 'AES-GCM', iv: stored.iv, additionalData: ADDITIONAL_DATA },
        stored.wrappingKey,
        stored.ciphertext,
      );
      if (plain.byteLength === DATABASE_KEY_BYTES) {
        return { bytes: new Uint8Array(plain), created: false };
      }
    } catch {
      // Chave guardada corrompida ou de outra origem: cai na criação de uma nova.
    }
  }
  await vault.clear();
  const bytes = random(new Uint8Array(DATABASE_KEY_BYTES));
  const wrappingKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  const iv = random(new Uint8Array(12));
  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: ADDITIONAL_DATA },
    wrappingKey,
    bytes,
  );
  await vault.write({ wrappingKey, iv, ciphertext });
  return { bytes, created: true };
}

/** Chave em hexadecimal, no formato de chave bruta do SQLite3 Multiple Ciphers (sem KDF). */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
