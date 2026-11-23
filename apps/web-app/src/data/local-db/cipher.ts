/**
 * Cifra do banco local (SEC-CR-08, estratégia 1, ADR-0008): SQLite3 Multiple Ciphers no esquema
 * SQLCipher 4 (AES-256-CBC + HMAC-SHA512), o mesmo formato do SQLCipher do mobile (SEC-CR-07).
 * A chave é bruta (256 bits aleatórios), então dispensa a derivação PBKDF2 do SQLCipher.
 */
export const CIPHER = 'sqlcipher';

type Query = (sql: string) => unknown[][];

/** Liga a cifra; precisa rodar antes de qualquer outro SQL da conexão. */
export function applyKey(query: Query, hexKey: string): void {
  if (!/^[0-9a-f]{64}$/.test(hexKey)) {
    throw new Error('Chave do banco local inválida.');
  }
  query(`PRAGMA cipher = '${CIPHER}'`);
  query('PRAGMA legacy = 4');
  query(`PRAGMA key = "x'${hexKey}'"`);
}

/**
 * Confere a cifra antes de usar o banco e aborta se ela não estiver ativa: um SQLite sem cifra
 * aceita `PRAGMA key` sem erro e gravaria em claro (mesma regra da SEC-CR-07 no mobile).
 * Também lê o esquema, que falha com `SQLITE_NOTADB` se a chave não abre o arquivo.
 */
export function verifyCipher(query: Query): string {
  const [version] = safeRow(query, 'SELECT sqlite3mc_version()');
  const [cipher] = safeRow(query, 'PRAGMA cipher');
  if (typeof version !== 'string' || !version || cipher !== CIPHER) {
    throw new Error('Banco local sem cifra ativa: abertura recusada.');
  }
  query('SELECT count(*) FROM sqlite_master');
  return `${CIPHER} (${version})`;
}

function safeRow(query: Query, sql: string): unknown[] {
  try {
    return query(sql)[0] ?? [];
  } catch {
    return [];
  }
}

/** `true` quando o erro diz que o arquivo não é um banco legível com esta chave. */
export function isNotADatabase(error: unknown): boolean {
  return error instanceof Error && /SQLITE_NOTADB|file is not a database/i.test(error.message);
}
