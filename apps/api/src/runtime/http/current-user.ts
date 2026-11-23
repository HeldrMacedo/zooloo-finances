import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { IdSchema } from '@zooloo/validation';
import type { FastifyRequest } from 'fastify';
import type { Env } from '../../config/env.js';
import { ENV } from '../../config/tokens.js';
import { ProblemException, problemForStatus } from './problem.js';

/** Cabeçalho de identificação provisório (ADR-0007). Só vale com `DEV_AUTH`, nunca em produção. */
export const DEV_USER_HEADER = 'x-dev-user-id';

type RequestWithUser = FastifyRequest & { userId?: string };

const unauthorized = (): ProblemException =>
  new ProblemException({ ...problemForStatus(401), detail: 'Identificação do usuário ausente.' });

/**
 * Identifica o usuário da requisição. Enquanto a autenticação não existe (TD-008), aceita só o
 * cabeçalho de desenvolvimento, e só quando `DEV_AUTH` está ligada; sem isso, toda rota protegida
 * responde 401. O guard de sessão real substitui este, sem mudar os controllers.
 */
@Injectable()
export class CurrentUserGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!this.env.DEV_AUTH) {
      throw unauthorized();
    }
    const parsed = IdSchema.safeParse(request.headers[DEV_USER_HEADER]);
    if (!parsed.success) {
      throw unauthorized();
    }
    request.userId = parsed.data;
    return true;
  }
}

/** ID do usuário autenticado; só em rotas com `CurrentUserGuard`. */
export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): string => {
  const { userId } = context.switchToHttp().getRequest<RequestWithUser>();
  if (userId === undefined) {
    throw unauthorized();
  }
  return userId;
});
