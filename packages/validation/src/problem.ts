import * as z from 'zod';

/** Corpo de erro `application/problem+json` (RFC 9457), padrão da API (doc 07 §3). */
export const ProblemSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  status: z.int().min(400).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.array(z.strictObject({ path: z.string(), message: z.string() })).optional(),
});

export type Problem = z.infer<typeof ProblemSchema>;

export const VALIDATION_PROBLEM_TYPE = 'https://zooloo.app/problems/validation';

/** Problema 422 a partir de um erro de validação; caminhos em notação de ponto (`items.0.name`). */
export function problemFromZodError(error: z.ZodError): Problem {
  return {
    type: VALIDATION_PROBLEM_TYPE,
    title: 'Dados inválidos',
    status: 422,
    errors: error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  };
}
