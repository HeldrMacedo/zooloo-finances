import { delimiter, join } from 'node:path';

export interface DockerLookupEnv {
  readonly platform: NodeJS.Platform;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly exists: (path: string) => boolean;
}

/**
 * Pastas onde o Docker Desktop instala `docker` e `docker-credential-desktop` no Windows, que nem
 * sempre estão no PATH do shell (instalação por usuário).
 */
export function dockerBinCandidates(env: DockerLookupEnv['env']): string[] {
  const candidates: string[] = [];
  if (env['LOCALAPPDATA']) {
    candidates.push(join(env['LOCALAPPDATA'], 'Programs', 'DockerDesktop', 'resources', 'bin'));
  }
  if (env['ProgramFiles']) {
    candidates.push(join(env['ProgramFiles'], 'Docker', 'Docker', 'resources', 'bin'));
  }
  return candidates;
}

/**
 * PATH para os processos filhos: no Windows acrescenta a pasta do Docker Desktop quando ela existe e
 * ainda não está no PATH. O Testcontainers e o `docker compose` precisam do credential helper.
 */
export function pathWithDocker({ platform, env, exists }: DockerLookupEnv): string {
  const current = env['PATH'] ?? env['Path'] ?? '';
  if (platform !== 'win32') {
    return current;
  }
  const entries = current.split(delimiter).map((entry) => entry.toLowerCase());
  const missing = dockerBinCandidates(env).filter(
    (dir) => exists(join(dir, 'docker.exe')) && !entries.includes(dir.toLowerCase()),
  );
  return [...missing, current].filter((part) => part !== '').join(delimiter);
}
