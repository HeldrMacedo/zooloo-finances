import { describe, expect, it } from 'vitest';
import { applyKey, isNotADatabase, verifyCipher } from './cipher.js';

const KEY = 'ab'.repeat(32);

function fakeQuery(answers: Record<string, unknown[][] | Error>) {
  const executed: string[] = [];
  const query = (sql: string) => {
    executed.push(sql);
    const answer = answers[sql] ?? [];
    if (answer instanceof Error) {
      throw answer;
    }
    return answer;
  };
  return { query, executed };
}

describe('applyKey', () => {
  it('escolhe SQLCipher 4 antes da chave bruta, nessa ordem', () => {
    const { query, executed } = fakeQuery({});
    applyKey(query, KEY);
    expect(executed).toEqual([
      "PRAGMA cipher = 'sqlcipher'",
      'PRAGMA legacy = 4',
      `PRAGMA key = "x'${KEY}'"`,
    ]);
  });

  it('recusa chave fora do formato (evita injeção no PRAGMA)', () => {
    const { query, executed } = fakeQuery({});
    for (const bad of ['', 'AB'.repeat(32), 'ab'.repeat(31), `${'ab'.repeat(31)}'"`]) {
      expect(() => applyKey(query, bad)).toThrow(/inválida/);
    }
    expect(executed).toEqual([]);
  });
});

describe('verifyCipher', () => {
  const ok = {
    'SELECT sqlite3mc_version()': [['SQLite3 Multiple Ciphers 2.7.1']],
    'PRAGMA cipher': [['sqlcipher']],
  };

  it('devolve a descrição da cifra e lê o esquema', () => {
    const { query, executed } = fakeQuery(ok);
    expect(verifyCipher(query)).toBe('sqlcipher (SQLite3 Multiple Ciphers 2.7.1)');
    expect(executed.at(-1)).toBe('SELECT count(*) FROM sqlite_master');
  });

  it('aborta sem SQLite3MC, com outra cifra ou com versão vazia', () => {
    const cases = [
      { ...ok, 'SELECT sqlite3mc_version()': new Error('no such function: sqlite3mc_version') },
      { ...ok, 'SELECT sqlite3mc_version()': [['']] },
      { ...ok, 'PRAGMA cipher': [['chacha20']] },
      { ...ok, 'PRAGMA cipher': [] },
    ];
    for (const answers of cases) {
      const { query, executed } = fakeQuery(answers);
      expect(() => verifyCipher(query)).toThrow(/sem cifra ativa/);
      expect(executed).not.toContain('SELECT count(*) FROM sqlite_master');
    }
  });

  it('propaga o erro de chave errada ao ler o esquema', () => {
    const { query } = fakeQuery({
      ...ok,
      'SELECT count(*) FROM sqlite_master': new Error('SQLITE_NOTADB: file is not a database'),
    });
    expect(() => verifyCipher(query)).toThrow(/NOTADB/);
  });
});

describe('isNotADatabase', () => {
  it('reconhece só o erro de arquivo ilegível', () => {
    expect(isNotADatabase(new Error('SQLITE_NOTADB: sqlite3 result code 26'))).toBe(true);
    expect(isNotADatabase(new Error('file is not a database'))).toBe(true);
    expect(isNotADatabase(new Error('SQLITE_CONSTRAINT'))).toBe(false);
    expect(isNotADatabase('SQLITE_NOTADB')).toBe(false);
  });
});
