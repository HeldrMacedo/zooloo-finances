import { migratePostgres } from '@zooloo/db-schema/migrate';
import { spawn, spawnSync, type SpawnOptions } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathWithDocker } from './docker.js';
import { connectionUris, renderEnvFile } from './env-file.js';
import { seedDatabase } from './seed.js';
import { portsFor, projectName, slugify } from './worktree.js';

/**
 * `pnpm dev:worktree [up|api|down|status]` (doc 12 §4). Sem argumento: `up` e depois `api`.
 * Sobe PostgreSQL e Redis isolados por worktree, aplica migrações, grava o seed sintético, gera
 * `.env.worktree` e roda a API em modo watch.
 */
const print = (text: string): void => {
  process.stdout.write(`${text}\n`);
};

function run(command: string, args: readonly string[], options: SpawnOptions = {}): void {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });
  if (result.status !== 0) {
    throw new Error(`Falhou: ${command} ${args.join(' ')} (código ${String(result.status)}).`);
  }
}

const root = (() => {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error('Rode dentro de um repositório git (worktree).');
  }
  return result.stdout.trim();
})();

const slug = slugify(basename(root));
const project = projectName(slug);
const ports = portsFor(slug);
const uris = connectionUris(ports);
const envFile = join(root, '.env.worktree');
const childEnv = {
  ...process.env,
  PATH: pathWithDocker({ platform: process.platform, env: process.env, exists: existsSync }),
  ZL_PROJECT: project,
  ZL_POSTGRES_PORT: String(ports.postgres),
  ZL_REDIS_PORT: String(ports.redis),
};

const compose = (args: readonly string[]): void =>
  run('docker', ['compose', '-f', join(root, 'infra', 'dev', 'compose.yaml'), ...args], {
    env: childEnv,
  });

function status(): void {
  print(`worktree   ${slug} (projeto Docker ${project})`);
  print(`postgres   127.0.0.1:${ports.postgres}  (app: zooloo_app, migrações: zooloo_owner)`);
  print(`redis      127.0.0.1:${ports.redis}`);
  print(`api        http://127.0.0.1:${ports.api}/api/v1/health`);
  print(`openapi    http://127.0.0.1:${ports.api}/api/v1/docs`);
  print(`env        ${envFile}`);
}

async function up(): Promise<void> {
  compose(['up', '-d', '--wait']);
  await migratePostgres(uris.owner);
  const users = await seedDatabase(uris.app);
  // Caminho fixo: raiz do git + nome constante.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(envFile, renderEnvFile(slug, ports));
  print(`migrações aplicadas; seed sintético com ${users} usuários.`);
  status();
}

/** Recompila a API a cada mudança (tsc --watch) e reinicia o processo (node --watch). */
function api(): void {
  const options: SpawnOptions = { stdio: 'inherit', cwd: root, env: childEnv, shell: false };
  const tsc = spawn(
    process.execPath,
    [
      join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      '-p',
      'apps/api/tsconfig.build.json',
      '--watch',
      '--preserveWatchOutput',
    ],
    options,
  );
  const server = spawn(
    process.execPath,
    ['--env-file', envFile, '--watch-path', 'apps/api/dist', 'apps/api/dist/main.js'],
    options,
  );
  const stop = (): void => {
    tsc.kill();
    server.kill();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

const command = process.argv[2] ?? 'dev';
switch (command) {
  case 'up':
    await up();
    break;
  case 'api':
    api();
    break;
  case 'down':
    // Remove contêineres e volumes: o banco desta worktree é descartável (só dados sintéticos).
    compose(['down', '--volumes', '--remove-orphans']);
    break;
  case 'status':
    status();
    break;
  case 'dev':
    await up();
    api();
    break;
  default:
    throw new Error(`Comando desconhecido: ${command}. Use up, api, down ou status.`);
}
