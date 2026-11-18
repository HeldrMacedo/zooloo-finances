import { describe, expect, it } from 'vitest';
import { connectionUris, renderEnvFile } from './env-file.js';

const ports = { postgres: 21230, redis: 21231, api: 21232, web: 21233 };

describe('connectionUris', () => {
  it('aplicação e dono apontam para o mesmo banco com papéis diferentes', () => {
    expect(connectionUris(ports)).toEqual({
      app: 'postgres://zooloo_app:dev-only-app@127.0.0.1:21230/zooloo',
      owner: 'postgres://zooloo_owner:dev-only-owner@127.0.0.1:21230/zooloo',
      redis: 'redis://127.0.0.1:21231',
    });
  });
});

describe('renderEnvFile', () => {
  it('gera o .env da worktree que a API valida na inicialização', () => {
    const text = renderEnvFile('feature-x', ports);
    expect(text).toContain('# Gerado por pnpm dev:worktree (feature-x).');
    expect(text).toContain('PORT=21232\n');
    expect(text).toContain(
      'DATABASE_URL=postgres://zooloo_app:dev-only-app@127.0.0.1:21230/zooloo\n',
    );
    expect(text).toContain('DATABASE_OWNER_URL=postgres://zooloo_owner:');
    expect(text).toContain('REDIS_URL=redis://127.0.0.1:21231\n');
    expect(text).toContain('OPENAPI_UI=true\n');
    expect(text).toContain('ZL_WEB_PORT=21233\n');
    expect(text.endsWith('\n')).toBe(true);
  });
});
