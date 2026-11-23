import { describe, expect, it } from 'vitest';
import {
  HlcSchema,
  SYNC_FIELDS,
  SYNC_PUSH_LIMIT,
  SyncPullQuerySchema,
  SyncPushRequestSchema,
} from './sync.js';

const ID = '0196f3a2-0000-7000-8000-0000000000c1';
const HLC = '001763556400000-000000-00000000000000aa';
const mutation = {
  entity: 'categories',
  id: ID,
  op: 'upsert',
  fields: { name: 'Lazer' },
  hlc: HLC,
};

describe('HlcSchema', () => {
  it.each([HLC, '000000000000000-999999-0123456789abcdef'])('aceita %s', (value) => {
    expect(HlcSchema.safeParse(value).success).toBe(true);
  });

  it.each(['', '1763556400000-000000-00000000000000aa', `${HLC}x`, HLC.toUpperCase()])(
    'recusa "%s"',
    (value) => {
      expect(HlcSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('SyncPushRequestSchema', () => {
  it('aceita lote válido', () => {
    expect(SyncPushRequestSchema.parse({ mutations: [mutation] }).mutations).toHaveLength(1);
  });

  it('recusa lote vazio, acima do limite, entidade desconhecida e campos extras', () => {
    const fail = (body: unknown) =>
      expect(SyncPushRequestSchema.safeParse(body).success).toBe(false);
    fail({ mutations: [] });
    fail({ mutations: Array.from({ length: SYNC_PUSH_LIMIT + 1 }, () => mutation) });
    fail({ mutations: [{ ...mutation, entity: 'users' }] });
    fail({ mutations: [{ ...mutation, op: 'drop' }] });
    fail({ mutations: [{ ...mutation, id: 'abc' }] });
    fail({ mutations: [mutation], extra: true });
    fail({ mutations: [{ ...mutation, userId: ID }] });
  });
});

describe('SyncPullQuerySchema', () => {
  it('converte da query string e aplica padrões', () => {
    expect(SyncPullQuerySchema.parse({})).toEqual({ since: 0, limit: 1000 });
    expect(SyncPullQuerySchema.parse({ since: '42', limit: '10' })).toEqual({
      since: 42,
      limit: 10,
    });
  });

  it('recusa cursor negativo e página grande demais', () => {
    expect(SyncPullQuerySchema.safeParse({ since: '-1' }).success).toBe(false);
    expect(SyncPullQuerySchema.safeParse({ limit: '1001' }).success).toBe(false);
  });
});

describe('SYNC_FIELDS', () => {
  it('categoria: valida campos e normaliza nome e cor', () => {
    expect(SYNC_FIELDS.categories.parse({ name: '  Lazer   e  cia ', color: '#bc4e26' })).toEqual({
      name: 'Lazer e cia',
      color: '#BC4E26',
    });
  });

  it('cliente não grava isSystem, userId nem colunas de controle', () => {
    for (const field of ['isSystem', 'userId', 'serverVersion', 'hlc', 'fieldHlc']) {
      expect(SYNC_FIELDS.categories.safeParse({ [field]: 'x' }).success, field).toBe(false);
    }
  });

  it('perfil: moeda ISO e tombstone com timestamp ou null', () => {
    expect(SYNC_FIELDS.profiles.safeParse({ currency: 'brl' }).success).toBe(false);
    expect(SYNC_FIELDS.profiles.parse({ deletedAt: null })).toEqual({ deletedAt: null });
    expect(SYNC_FIELDS.profiles.safeParse({ deletedAt: 'ontem' }).success).toBe(false);
  });
});
