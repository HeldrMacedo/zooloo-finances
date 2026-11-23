import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Env } from '../../config/env.js';
import { CurrentUserGuard, DEV_USER_HEADER } from './current-user.js';
import { ProblemException } from './problem.js';

const USER = '0196f3a2-0000-7000-8000-00000000000a';

function context(headers: Record<string, string>) {
  const request: { headers: Record<string, string>; userId?: string } = { headers };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, ctx };
}

const guard = (devAuth: boolean) => new CurrentUserGuard({ DEV_AUTH: devAuth } as Env);

describe('CurrentUserGuard (ADR-0007)', () => {
  it('com DEV_AUTH, aceita UUIDv7 no cabeçalho e anota o usuário na requisição', () => {
    const { request, ctx } = context({ [DEV_USER_HEADER]: USER });
    expect(guard(true).canActivate(ctx)).toBe(true);
    expect(request.userId).toBe(USER);
  });

  it('sem DEV_AUTH, recusa mesmo com cabeçalho válido (não há outra autenticação ainda)', () => {
    const { request, ctx } = context({ [DEV_USER_HEADER]: USER });
    expect(() => guard(false).canActivate(ctx)).toThrow(ProblemException);
    expect(request.userId).toBeUndefined();
  });
});
