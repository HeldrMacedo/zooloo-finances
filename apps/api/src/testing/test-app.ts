import type { Type } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { startTestDatabase, type TestDatabase } from '@zooloo/db-schema/testing';
import { createLogger, type LogRecord } from '@zooloo/security';
import type { Env } from '../config/env.js';
import { createApp } from '../create-app.js';

export interface TestApi {
  readonly app: NestFastifyApplication;
  readonly db: TestDatabase;
  /** Registros de log já mascarados, para verificar que nada sensível vaza. */
  readonly logs: LogRecord[];
  close(): Promise<void>;
}

/** API real sobre PostgreSQL real (Testcontainers), conectada como `zooloo_app`. */
export async function startTestApi(
  overrides: Partial<Env> = {},
  extraModules: readonly Type[] = [],
): Promise<TestApi> {
  const db = await startTestDatabase();
  const logs: LogRecord[] = [];
  const env: Env = {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: 0,
    DATABASE_URL: db.appConnectionUri,
    DATABASE_POOL_MAX: 4,
    LOG_LEVEL: 'debug',
    OPENAPI_UI: false,
    DEV_AUTH: false,
    ...overrides,
  };
  const logger = createLogger({ sink: (record) => logs.push(record), level: 'debug' });
  const app = await createApp(env, logger, extraModules);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return {
    app,
    db,
    logs,
    async close() {
      await app.close();
      await db.stop();
    },
  };
}
