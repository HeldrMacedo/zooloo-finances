import * as z from 'zod';
import { describe, expect, it } from 'vitest';
import { problemFromZodError, ProblemSchema } from './problem.js';

describe('ProblemSchema (RFC 9457)', () => {
  it('aceita problema mínimo e extensões', () => {
    const problem = {
      type: 'https://zooloo.app/problems/validation',
      title: 'Dados inválidos',
      status: 422,
      errors: [{ path: 'name', message: 'Obrigatório.' }],
    };
    expect(ProblemSchema.parse(problem)).toEqual(problem);
  });

  it('status precisa ser código HTTP de erro', () => {
    expect(ProblemSchema.safeParse({ type: 'about:blank', title: 'x', status: 200 }).success).toBe(
      false,
    );
  });
});

describe('problemFromZodError', () => {
  it('converte issues em problema 422 com caminho em notação de ponto', () => {
    const schema = z.object({ items: z.array(z.object({ name: z.string() })) });
    const result = schema.safeParse({ items: [{ name: 1 }] });
    if (result.success) {
      throw new Error('esperava falha');
    }
    const problem = problemFromZodError(result.error);
    expect(problem).toMatchObject({
      type: 'https://zooloo.app/problems/validation',
      title: 'Dados inválidos',
      status: 422,
    });
    expect(problem.errors).toEqual([{ path: 'items.0.name', message: expect.any(String) }]);
    expect(ProblemSchema.parse(problem)).toEqual(problem);
  });

  it('erro na raiz tem caminho vazio', () => {
    const result = z.string().safeParse(1);
    if (result.success) {
      throw new Error('esperava falha');
    }
    expect(problemFromZodError(result.error).errors?.[0]?.path).toBe('');
  });
});
