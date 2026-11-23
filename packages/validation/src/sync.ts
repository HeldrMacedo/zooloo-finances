import * as z from 'zod';
import { CategoryNameSchema, CategoryTypeSchema, IconNameSchema } from './category.js';
import { CurrencySchema, HexColorSchema, IdSchema, IsoDateTimeSchema } from './primitives.js';

/** HLC serializado de `@zooloo/sync-core`: parede (15) - contador (6) - nó (16 hex). */
export const HlcSchema = z.string().regex(/^\d{15}-\d{6}-[0-9a-f]{16}$/, 'HLC mal formado.');

/** Entidades sincronizadas nesta fase (PoC 2, ADR-0007). */
export const SyncEntitySchema = z.enum(['profiles', 'categories']);

export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** Valor JSON genérico; cada entidade valida os próprios campos depois (`SYNC_FIELDS`). */
const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string().max(10_000),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema).max(1_000),
    z.record(z.string().max(100), JsonValueSchema),
  ]),
);

export const SyncMutationSchema = z.strictObject({
  entity: SyncEntitySchema,
  id: IdSchema,
  op: z.enum(['upsert', 'delete']),
  fields: z.record(z.string().max(64), JsonValueSchema),
  hlc: HlcSchema,
});

export const SYNC_PUSH_LIMIT = 500;
export const SYNC_PULL_LIMIT = 1000;

export const SyncPushRequestSchema = z
  .strictObject({
    mutations: z.array(SyncMutationSchema).min(1).max(SYNC_PUSH_LIMIT),
  })
  .meta({ id: 'SyncPushRequest' });

export const SyncChangeSchema = z
  .strictObject({
    entity: SyncEntitySchema,
    id: IdSchema,
    version: z.int().min(1),
    fields: z.record(z.string(), JsonValueSchema),
    clocks: z.record(z.string(), HlcSchema),
  })
  .meta({ id: 'SyncChange' });

export const SyncPushResponseSchema = z
  .strictObject({
    version: z.int().min(0),
    rejected: z.array(
      z.strictObject({
        index: z.int().min(0),
        reason: z.enum(['invalid', 'conflict', 'not_found']),
        current: SyncChangeSchema.nullable(),
      }),
    ),
  })
  .meta({ id: 'SyncPushResponse' });

export const SyncPullQuerySchema = z.strictObject({
  since: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(SYNC_PULL_LIMIT).default(SYNC_PULL_LIMIT),
});

export const SyncPullResponseSchema = z
  .strictObject({
    changes: z.array(SyncChangeSchema),
    version: z.int().min(0),
    hasMore: z.boolean(),
  })
  .meta({ id: 'SyncPullResponse' });

const tombstone = { deletedAt: IsoDateTimeSchema.nullable() };

/**
 * Campos graváveis pelo cliente, por entidade. `isSystem`, `userId` e colunas de controle nunca vêm
 * do cliente. Mutação com campo fora da lista é recusada.
 */
export const SYNC_FIELDS = {
  profiles: z
    .strictObject({
      name: z.string().trim().min(1).max(60),
      currency: CurrencySchema,
      color: HexColorSchema,
      icon: IconNameSchema,
      archivedAt: IsoDateTimeSchema.nullable(),
      sortOrder: z.int().min(0),
      ...tombstone,
    })
    .partial(),
  categories: z
    .strictObject({
      profileId: IdSchema,
      type: CategoryTypeSchema,
      name: CategoryNameSchema,
      parentId: IdSchema.nullable(),
      icon: IconNameSchema,
      color: HexColorSchema,
      archivedAt: IsoDateTimeSchema.nullable(),
      sortOrder: z.int().min(0),
      ...tombstone,
    })
    .partial(),
} as const;

/** Campos obrigatórios para criar o registro no servidor. */
export const SYNC_REQUIRED_ON_CREATE = {
  profiles: ['name', 'currency', 'color', 'icon'],
  categories: ['profileId', 'type', 'name', 'icon', 'color'],
} as const satisfies Record<SyncEntity, readonly string[]>;

/** Campos que não mudam depois de criados (o tipo da categoria; a moeda do perfil, RN-PRF-02). */
export const SYNC_IMMUTABLE = {
  profiles: ['currency'],
  categories: ['type', 'profileId'],
} as const satisfies Record<SyncEntity, readonly string[]>;

export type SyncEntity = z.infer<typeof SyncEntitySchema>;
export type SyncMutation = z.infer<typeof SyncMutationSchema>;
export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>;
export type SyncPullQuery = z.infer<typeof SyncPullQuerySchema>;
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;
export type SyncChange = z.infer<typeof SyncChangeSchema>;
