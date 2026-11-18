import { money, parseLocalDate } from '@zooloo/domain';
import * as z from 'zod';

/** ID de entidade: UUIDv7 gerado no cliente, para criar offline sem colisão (RNF-SYN-02). */
export const IdSchema = z.uuid({ version: 'v7', error: 'ID precisa ser UUIDv7.' });

/** Data de negócio `YYYY-MM-DD`, convertida em `LocalDate` (RNF-FIN-02). */
export const LocalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data precisa estar em YYYY-MM-DD.')
  .transform((value, context) => {
    try {
      return parseLocalDate(value);
    } catch {
      // O regex já garante o formato; aqui só falha data inexistente (ex.: 2026-02-30).
      context.addIssue({ code: 'custom', message: 'Data inexistente.' });
      return z.NEVER;
    }
  });

/** Timestamp UTC em ISO 8601 com `Z`. */
export const IsoDateTimeSchema = z.iso.datetime({ error: 'Timestamp precisa ser ISO 8601 UTC.' });

/** Valor em centavos: inteiro seguro, nunca float nem string (RNF-FIN-01). */
export const CentsSchema = z.int({ error: 'Valor precisa ser inteiro em centavos.' });

export const CurrencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Moeda precisa ser código ISO 4217 (ex.: BRL).');

export const MoneySchema = z
  .strictObject({ cents: CentsSchema, currency: CurrencySchema })
  .transform(({ cents, currency }) => money(cents, currency));

export const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor precisa estar em #RRGGBB.')
  .transform((value) => value.toUpperCase());

/** Cabeçalho `Idempotency-Key`, obrigatório em POST de criação (doc 07 §3). */
export const IdempotencyKeySchema = z.uuid({ error: 'Idempotency-Key precisa ser UUID.' });

const MAX_PAGE_SIZE = 200;

/** Paginação por cursor (doc 07 §3). O cursor é opaco, em base64url. */
export const CursorPageQuerySchema = z.strictObject({
  cursor: z
    .string()
    .max(512)
    .regex(/^[A-Za-z0-9_-]+$/, 'Cursor inválido.')
    .optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
});

export type CursorPageQuery = z.infer<typeof CursorPageQuerySchema>;
