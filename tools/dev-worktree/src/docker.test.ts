import { delimiter, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dockerBinCandidates, pathWithDocker } from './docker.js';

const LOCAL = join('C:', 'Users', 'dev', 'AppData', 'Local');
const PROGRAMS = join('C:', 'Program Files');
const userBin = join(LOCAL, 'Programs', 'DockerDesktop', 'resources', 'bin');
const machineBin = join(PROGRAMS, 'Docker', 'Docker', 'resources', 'bin');

describe('dockerBinCandidates', () => {
  it('instalação por usuário e por máquina', () => {
    expect(dockerBinCandidates({ LOCALAPPDATA: LOCAL, ProgramFiles: PROGRAMS })).toEqual([
      userBin,
      machineBin,
    ]);
    expect(dockerBinCandidates({})).toEqual([]);
  });
});

describe('pathWithDocker', () => {
  const env = { LOCALAPPDATA: LOCAL, ProgramFiles: PROGRAMS, PATH: 'X' };

  it('fora do Windows mantém o PATH', () => {
    expect(pathWithDocker({ platform: 'linux', env, exists: () => true })).toBe('X');
  });

  it('no Windows acrescenta só a pasta que existe', () => {
    const exists = (path: string) => path === join(userBin, 'docker.exe');
    expect(pathWithDocker({ platform: 'win32', env, exists })).toBe([userBin, 'X'].join(delimiter));
  });

  it('não duplica pasta já presente (sem diferenciar maiúsculas) e aceita a variável Path', () => {
    const current = [userBin.toUpperCase(), 'Y'].join(delimiter);
    expect(
      pathWithDocker({
        platform: 'win32',
        env: { LOCALAPPDATA: LOCAL, Path: current },
        exists: () => true,
      }),
    ).toBe(current);
  });

  it('sem PATH nenhum devolve só a pasta do Docker', () => {
    expect(
      pathWithDocker({ platform: 'win32', env: { LOCALAPPDATA: LOCAL }, exists: () => true }),
    ).toBe(userBin);
  });
});
