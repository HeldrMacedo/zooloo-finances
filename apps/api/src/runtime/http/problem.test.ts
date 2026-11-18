import { ProblemSchema } from '@zooloo/validation';
import { describe, expect, it } from 'vitest';
import { problemForStatus, validationProblem } from './problem.js';

describe('problemForStatus', () => {
  it.each([400, 401, 403, 404, 405, 409, 413, 415, 429, 503])('status conhecido %i', (status) => {
    const problem = problemForStatus(status);
    expect(ProblemSchema.parse(problem)).toEqual(problem);
    expect(problem.status).toBe(status);
    expect(problem.type).toMatch(/^https:\/\/zooloo\.app\/problems\//);
  });

  it('5xx desconhecido vira 500 genérico', () => {
    expect(problemForStatus(502)).toEqual({
      type: 'https://zooloo.app/problems/internal',
      title: 'Erro interno',
      status: 500,
    });
  });

  it('4xx desconhecido mantém o status com tipo about:blank', () => {
    expect(problemForStatus(418)).toEqual({
      type: 'about:blank',
      title: 'Erro na requisição',
      status: 418,
    });
  });
});

describe('validationProblem', () => {
  it('junta caminhos de chaves simples e objetos PathSegment', () => {
    expect(
      validationProblem([
        { message: 'a', path: ['items', 0, 'name'] },
        { message: 'b', path: [{ key: 'tags' }, { key: 1 }] },
        { message: 'c' },
      ]).errors,
    ).toEqual([
      { path: 'items.0.name', message: 'a' },
      { path: 'tags.1', message: 'b' },
      { path: '', message: 'c' },
    ]);
  });
});
