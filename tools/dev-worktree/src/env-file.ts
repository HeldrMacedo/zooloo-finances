import type { WorktreePorts } from './worktree.js';

/** Credenciais do PostgreSQL local, iguais às de `infra/dev/postgres-init.sql`. Só desenvolvimento. */
const APP_USER = 'zooloo_app:dev-only-app';
const OWNER_USER = 'zooloo_owner:dev-only-owner';
const HOST = '127.0.0.1';

export interface ConnectionUris {
  /** Papel da aplicação, sujeito à RLS: o que a API usa. */
  readonly app: string;
  /** Papel dono das tabelas: só para migrações. */
  readonly owner: string;
  readonly redis: string;
}

export function connectionUris(ports: WorktreePorts): ConnectionUris {
  return {
    app: `postgres://${APP_USER}@${HOST}:${ports.postgres}/zooloo`,
    owner: `postgres://${OWNER_USER}@${HOST}:${ports.postgres}/zooloo`,
    redis: `redis://${HOST}:${ports.redis}`,
  };
}

/** Conteúdo do `.env.worktree` (ignorado pelo git), lido pela API com `node --env-file`. */
export function renderEnvFile(slug: string, ports: WorktreePorts): string {
  const uris = connectionUris(ports);
  const lines = [
    `# Gerado por pnpm dev:worktree (${slug}). Não edite: rode o comando de novo.`,
    'NODE_ENV=development',
    `HOST=${HOST}`,
    `PORT=${ports.api}`,
    `DATABASE_URL=${uris.app}`,
    `DATABASE_OWNER_URL=${uris.owner}`,
    `REDIS_URL=${uris.redis}`,
    'LOG_LEVEL=debug',
    'OPENAPI_UI=true',
    `ZL_WEB_PORT=${ports.web}`,
  ];
  return `${lines.join('\n')}\n`;
}
