import { type DynamicModule, Module, type Type } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import type { Logger } from '@zooloo/security';
import type { Env } from './config/env.js';
import { ENV, LOGGER } from './config/tokens.js';
import { HealthController } from './modules/health/health.controller.js';
import { DatabaseModule } from './providers/database/database.module.js';
import { ProblemFilter } from './runtime/http/problem.filter.js';

@Module({})
export class AppModule {
  /** Ambiente e logger entram de fora: `main.ts` em produção, o teste com valores próprios. */
  static register(env: Env, logger: Logger, extraModules: readonly Type[] = []): DynamicModule {
    return {
      module: AppModule,
      global: true,
      imports: [DatabaseModule, ...extraModules],
      controllers: [HealthController],
      providers: [
        { provide: ENV, useValue: env },
        { provide: LOGGER, useValue: logger },
        { provide: APP_FILTER, useClass: ProblemFilter },
      ],
      exports: [ENV, LOGGER],
    };
  }
}
