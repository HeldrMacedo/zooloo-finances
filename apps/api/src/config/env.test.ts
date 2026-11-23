import { describe, expect, it } from 'vitest';
import { InvalidEnvError, loadEnv } from './env.js';

const DATABASE_URL = 'postgres://zooloo_app:segredo@db:5432/zooloo';

describe('loadEnv', () => {
  it('aplica padrões e converte tipos', () => {
    expect(loadEnv({ DATABASE_URL, PORT: '8080', OPENAPI_UI: 'true' })).toEqual({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 8080,
      DATABASE_URL,
      DATABASE_POOL_MAX: 10,
      LOG_LEVEL: 'info',
      OPENAPI_UI: true,
      DEV_AUTH: false,
    });
  });

  it('DEV_AUTH só fora de produção', () => {
    expect(loadEnv({ DATABASE_URL, DEV_AUTH: 'true' }).DEV_AUTH).toBe(true);
    expect(() => loadEnv({ DATABASE_URL, DEV_AUTH: 'true', NODE_ENV: 'production' })).toThrow(
      /DEV_AUTH não pode ser ligada em produção/,
    );
  });

  it('aceita postgresql://', () => {
    expect(loadEnv({ DATABASE_URL: 'postgresql://u@h/d' }).DATABASE_URL).toBe('postgresql://u@h/d');
  });

  it.each([
    [{}, 'DATABASE_URL'],
    [{ DATABASE_URL: 'mysql://u@h/d' }, 'DATABASE_URL'],
    [{ DATABASE_URL, PORT: '70000' }, 'PORT'],
    [{ DATABASE_URL, NODE_ENV: 'staging' }, 'NODE_ENV'],
    [{ DATABASE_URL, LOG_LEVEL: 'trace' }, 'LOG_LEVEL'],
  ])('recusa %o citando %s', (source, field) => {
    expect(() => loadEnv(source)).toThrow(InvalidEnvError);
    expect(() => loadEnv(source)).toThrow(field);
  });

  it('a mensagem de erro nunca contém o valor (pode ser segredo)', () => {
    const secret = 'postgres://u:SENHA-SECRETA@h/d';
    expect(() => loadEnv({ DATABASE_URL: secret, PORT: 'x' })).toThrow(InvalidEnvError);
    try {
      loadEnv({ DATABASE_URL: secret, PORT: 'x' });
    } catch (error) {
      expect((error as Error).message).not.toContain('SENHA-SECRETA');
    }
  });
});
