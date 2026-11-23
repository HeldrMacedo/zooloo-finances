/**
 * Estratégia 2 da SEC-CR-08: cifra por campo com AES-GCM do Web Crypto. Só para comparação na
 * PoC 3 (ADR-0008); o banco local usa a estratégia 1 (arquivo inteiro cifrado).
 *
 * Formato: `v1.<iv base64>.<texto cifrado base64>`. O contexto (tabela, coluna e id) entra como
 * dado autenticado: um valor copiado para outra linha ou coluna não decifra.
 */
const PREFIX = 'v1';

export interface FieldCipher {
  encrypt(plain: string, context: string): Promise<string>;
  decrypt(sealed: string, context: string): Promise<string>;
}

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

export async function createFieldCipher(
  keyBytes: Uint8Array<ArrayBuffer>,
  subtle: SubtleCrypto = crypto.subtle,
  random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer> = (bytes) =>
    crypto.getRandomValues(bytes),
): Promise<FieldCipher> {
  const key = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return {
    async encrypt(plain, context) {
      const iv = random(new Uint8Array(12));
      const sealed = await subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: encoder.encode(context) },
        key,
        encoder.encode(plain),
      );
      return `${PREFIX}.${toBase64(iv)}.${toBase64(new Uint8Array(sealed))}`;
    },
    async decrypt(sealed, context) {
      const [prefix, iv, data, ...rest] = sealed.split('.');
      if (prefix !== PREFIX || !iv || !data || rest.length > 0) {
        throw new Error('Valor cifrado em formato desconhecido.');
      }
      const plain = await subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(iv), additionalData: encoder.encode(context) },
        key,
        fromBase64(data),
      );
      return decoder.decode(plain);
    },
  };
}
