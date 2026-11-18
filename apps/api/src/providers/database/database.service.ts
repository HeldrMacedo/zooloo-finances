import { Inject, Injectable } from '@nestjs/common';
import { userContext } from '@zooloo/db-schema';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { PG_POOL } from '../../config/tokens.js';

export type Tx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

/**
 * Única porta da aplicação para o banco (doc 12 §5.1, Providers). Todo acesso a dados do usuário
 * passa por `withUser`, que abre a transação já no contexto da RLS (ADR-0005).
 */
@Injectable()
export class DatabaseService {
  private readonly db: NodePgDatabase;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    this.db = drizzle(pool);
  }

  /** Executa `work` numa transação em nome de `userId`; nenhuma linha de outro usuário é visível. */
  withUser<T>(userId: string, work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(userContext(userId));
      return work(tx);
    });
  }

  /** Verificação de prontidão: o banco responde. */
  async ping(): Promise<void> {
    await this.pool.query('select 1');
  }
}
