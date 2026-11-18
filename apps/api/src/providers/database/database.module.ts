import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import type { Env } from '../../config/env.js';
import { ENV, PG_POOL } from '../../config/tokens.js';
import { DatabaseService } from './database.service.js';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ENV],
      useFactory: (env: Env) =>
        new pg.Pool({
          connectionString: env.DATABASE_URL,
          max: env.DATABASE_POOL_MAX,
          connectionTimeoutMillis: 5_000,
          // Teto de segurança para consulta presa; o orçamento real é RNF-DSP-02.
          statement_timeout: 10_000,
          application_name: 'zooloo-api',
        }),
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
