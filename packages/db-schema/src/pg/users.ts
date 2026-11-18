import { sql } from 'drizzle-orm';
import { boolean, customType, date, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditTimestamps, timestamptz } from './columns.js';
import { ownerPolicies } from './rls.js';

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
});

/** Usuário (doc 05 §1). Campos de teste grátis e assinatura entram na Fase 1.1 (doc 11 §5). */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    emailVerifiedAt: timestamptz('email_verified_at'),
    name: text('name').notNull(),
    birthDate: date('birth_date', { mode: 'string' }),
    passwordHash: text('password_hash'),
    locale: text('locale').notNull().default('pt-BR'),
    timezone: text('timezone').notNull().default('America/Sao_Paulo'),
    marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
    lastActiveAt: timestamptz('last_active_at').notNull().defaultNow(),
    deletionScheduledAt: timestamptz('deletion_scheduled_at'),
    /** DEK do usuário cifrada pela KEK no KMS (SEC-CR-03/04). */
    wrappedDek: bytea('wrapped_dek').notNull(),
    totpSecretEnc: bytea('totp_secret_enc'),
    recoveryCodesHash: text('recovery_codes_hash').array(),
    ...auditTimestamps(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(sql`lower(${table.email})`),
    ...ownerPolicies(table.id),
  ],
).enableRLS();
