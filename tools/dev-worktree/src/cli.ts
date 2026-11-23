import { migratePostgres } from '@zooloo/db-schema/migrate';
import { spawn, spawnSync, type SpawnOptions } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathWithDocker } from './docker.js';
import { connectionUris, renderEnvFile } from './env-file.js';
import { SEED_USERS } from './seed-data.js';
import { seedDatabase } from './seed.js';
import { portsFor, projectName, slugify } from './worktree.js';

/**
 * `pnpm dev:worktree [up|api|web|down|status]` (doc 12 §4). Sem argumento: `up`, `api` e `web`.
 * Sobe PostgreSQL e Redis isolados por worktree, aplica migrações, grava o seed sintético, gera
 * `.env.worktree` e roda a API e o web-app em modo watch.
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
  print(`web-app    http://127.0.0.1:${ports.web}/app/`);
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

/** Processos em watch desta sessão, encerrados juntos no Ctrl+C. */
const children: ReturnType<typeof spawn>[] = [];
const stopAll = (): void => {
  for (const child of children) {
    child.kill();
  }
};
process.once('SIGINT', stopAll);
process.once('SIGTERM', stopAll);

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
  children.push(tsc, server);
}

/** Vite do web-app na porta da worktree, com proxy de `/api` para a API desta worktree. */
function web(): void {
  const vite = spawn(
    process.execPath,
    [join(root, 'apps', 'web-app', 'node_modules', 'vite', 'bin', 'vite.js')],
    {
      stdio: 'inherit',
      cwd: join(root, 'apps', 'web-app'),
      env: {
        ...childEnv,
        ZL_WEB_PORT: String(ports.web),
        PORT: String(ports.api),
        // Usuário do seed que a PoC de sync usa por padrão (ADR-0007).
        VITE_ZL_DEV_USER_ID: SEED_USERS[0]?.id ?? '',
      },
      shell: false,
    },
  );
  children.push(vite);
}

const command = process.argv[2] ?? 'dev';
switch (command) {
  case 'up':
    await up();
    break;
  case 'api':
    api();
    break;
  case 'web':
    web();
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
    web();
    break;
  default:
    throw new Error(`Comando desconhecido: ${command}. Use up, api, web, down ou status.`);
}
