import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Inject,
} from '@nestjs/common';
import type { Logger } from '@zooloo/security';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { LOGGER } from '../../config/tokens.js';
import { PROBLEM_CONTENT_TYPE, ProblemException, problemForStatus } from './problem.js';

/** Toda resposta de erro sai em `application/problem+json` (RFC 9457, doc 07 §3). */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest>();

    const problem =
      exception instanceof ProblemException
        ? exception.problem
        : problemForStatus(exception instanceof HttpException ? exception.getStatus() : 500);

    if (problem.status >= 500) {
      // Mensagem e stack passam pelo mascaramento do logger; o cliente só vê o título genérico.
      this.logger.error('erro não tratado', {
        method: request.method,
        route: request.routeOptions.url,
        err: exception,
      });
    }

    void reply
      .status(problem.status)
      .header('content-type', PROBLEM_CONTENT_TYPE)
      .send({ ...problem, instance: request.url.split('?')[0] });
  }
}
