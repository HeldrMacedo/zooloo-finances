import 'reflect-metadata';
import helmet from '@fastify/helmet';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { Type } from '@nestjs/common';
import type { Logger } from '@zooloo/security';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { isOpenApiUiEnabled, setupOpenApi } from './openapi.js';
import { NestLogger } from './providers/logging/nest-logger.js';
import { ProblemException, validationProblem } from './runtime/http/problem.js';

export const API_PREFIX = 'api/v1';
const BODY_LIMIT_BYTES = 1_048_576;

/** Monta a aplicação com todas as proteções; usado por `main.ts` e pelos testes de integração. */
export async function createApp(
  env: Env,
  logger: Logger,
  extraModules: readonly Type[] = [],
): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(env, logger, extraModules),
    new FastifyAdapter({ bodyLimit: BODY_LIMIT_BYTES, trustProxy: env.NODE_ENV === 'production' }),
    { logger: new NestLogger(logger), bufferLogs: false },
  );

  // Cabeçalhos de segurança (doc 10 §7). A API só devolve JSON: CSP fechada. A Swagger UI, que
  // só existe fora de produção, precisa carregar os próprios scripts, estilos e imagens.
  const self = isOpenApiUiEnabled(env) ? ["'self'"] : ["'none'"];
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: self,
        styleSrc: self,
        imgSrc: isOpenApiUiEnabled(env) ? ["'self'", 'data:'] : ["'none'"],
        connectSrc: self,
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  app.setGlobalPrefix(API_PREFIX);
  // Validar na fronteira (doc 12 §5.2): todo parâmetro com `{ schema }` passa pelo Zod.
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      exceptionFactory: (issues) => new ProblemException(validationProblem(issues)),
    }),
  );
  setupOpenApi(app, env);
  app.enableShutdownHooks();
  return app;
}
