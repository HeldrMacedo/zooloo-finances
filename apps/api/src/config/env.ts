import * as z from 'zod';

/** Configuração validada na inicialização: a API não sobe com variável faltando ou inválida. */
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    /** Conexão com o papel `zooloo_app`, sujeito à RLS (ADR-0005). Nunca o dono das tabelas. */
    DATABASE_URL: z.url({
      protocol: /^postgres(ql)?$/,
      error: 'DATABASE_URL precisa ser postgres://',
    }),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    /** Swagger UI só fora de produção; o JSON do OpenAPI fica sempre disponível. */
    OPENAPI_UI: z.stringbool().default(false),
    /**
     * Identificação de usuário por `X-Dev-User-Id`, até a autenticação existir (TD-008, ADR-0007).
     * Proibida em produção: a API nem sobe com ela ligada.
     */
    DEV_AUTH: z.stringbool().default(false),
  })
  .refine((env) => !(env.NODE_ENV === 'production' && env.DEV_AUTH), {
    message: 'DEV_AUTH não pode ser ligada em produção.',
    path: ['DEV_AUTH'],
  });

export type Env = z.infer<typeof EnvSchema>;

export class InvalidEnvError extends Error {
  override readonly name = 'InvalidEnvError';
}

/** Lê o ambiente. A mensagem cita só os nomes das variáveis, nunca os valores (podem ser segredos). */
export function loadEnv(source: Readonly<Record<string, string | undefined>>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new InvalidEnvError(`Configuração inválida: ${fields.join('; ')}`);
  }
  return result.data;
}
