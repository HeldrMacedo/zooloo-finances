import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Problem } from '@zooloo/validation';
import { VALIDATION_PROBLEM_TYPE } from '@zooloo/validation';

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';
const PROBLEM_BASE = 'https://zooloo.app/problems';

/** Erro HTTP que já carrega o corpo RFC 9457. */
export class ProblemException extends Error {
  override readonly name = 'ProblemException';

  constructor(readonly problem: Problem) {
    super(problem.title);
  }
}

const TITLES: Record<number, { slug: string; title: string }> = {
  400: { slug: 'bad-request', title: 'Requisição inválida' },
  401: { slug: 'unauthorized', title: 'Autenticação necessária' },
  403: { slug: 'forbidden', title: 'Acesso negado' },
  404: { slug: 'not-found', title: 'Recurso não encontrado' },
  405: { slug: 'method-not-allowed', title: 'Método não permitido' },
  409: { slug: 'conflict', title: 'Conflito' },
  413: { slug: 'payload-too-large', title: 'Corpo da requisição grande demais' },
  415: { slug: 'unsupported-media-type', title: 'Tipo de conteúdo não suportado' },
  429: { slug: 'too-many-requests', title: 'Muitas requisições' },
  503: { slug: 'unavailable', title: 'Serviço indisponível' },
};

/** Problema padrão para um status HTTP. Erro 5xx desconhecido nunca expõe detalhes internos. */
export function problemForStatus(status: number): Problem {
  const known = TITLES[status];
  if (known) {
    return { type: `${PROBLEM_BASE}/${known.slug}`, title: known.title, status };
  }
  return status >= 500
    ? { type: `${PROBLEM_BASE}/internal`, title: 'Erro interno', status: 500 }
    : { type: 'about:blank', title: 'Erro na requisição', status };
}

/** Converte issues do Standard Schema (Zod) em problema 422 com caminhos em notação de ponto. */
export function validationProblem(issues: readonly StandardSchemaV1.Issue[]): Problem {
  return {
    type: VALIDATION_PROBLEM_TYPE,
    title: 'Dados inválidos',
    status: 422,
    errors: issues.map((issue) => ({
      path: (issue.path ?? [])
        .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
        .join('.'),
      message: issue.message,
    })),
  };
}
