import { describe, expect, it } from 'vitest';
import type { DatabaseService } from '../../providers/database/database.service.js';
import { ProblemException } from '../../runtime/http/problem.js';
import { HealthController } from './health.controller.js';

describe('HealthController.ready', () => {
  it('banco fora do ar vira 503 problem sem detalhes do erro original', async () => {
    const database = {
      ping: () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:5432')),
    } as unknown as DatabaseService;
    const error: unknown = await new HealthController(database).ready().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemException);
    expect((error as ProblemException).problem).toMatchObject({
      status: 503,
      detail: 'Banco de dados indisponível.',
    });
    expect(JSON.stringify((error as ProblemException).problem)).not.toContain('10.0.0.5');
  });
});
