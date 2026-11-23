import { bigint, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, precision: 3 });

/** Datas de controle de qualquer tabela. */
export const auditTimestamps = () => ({
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

/**
 * Campos comuns de entidade sincronizável (doc 05, cabeçalho). `id` é UUIDv7 gerado no cliente
 * (RNF-SYN-02). `user_id` é desnormalizado em toda tabela de dados para a RLS comparar uma coluna
 * só e para o particionamento por usuário (RNF-DSP-05) (ADR-0005).
 */
export const syncColumns = () => ({
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  ...auditTimestamps(),
  deletedAt: timestamptz('deleted_at'),
  serverVersion: bigint('server_version', { mode: 'number' }).notNull().default(0),
  /** Maior HLC entre os campos: ordena a última escrita do registro. */
  hlc: text('hlc').notNull(),
  /** HLC da última escrita de cada campo, para o merge por campo (doc 07 §4, ADR-0007). */
  fieldHlc: jsonb('field_hlc').$type<Record<string, string>>().notNull().default({}),
});

export { timestamptz };
