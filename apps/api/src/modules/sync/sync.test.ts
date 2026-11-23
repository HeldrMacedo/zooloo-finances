import { asUser } from '@zooloo/db-schema/testing';
import { formatHlc } from '@zooloo/sync-core';
import {
  ProblemSchema,
  type SyncMutation,
  SyncPullResponseSchema,
  SyncPushResponseSchema,
} from '@zooloo/validation';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApi, type TestApi } from '../../testing/test-app.js';

const USER_A = '0196f3a2-0000-7000-8000-00000000000a';
const USER_B = '0196f3a2-0000-7000-8000-00000000000b';
const PROFILE_A = '0196f3a2-0000-7000-8000-0000000000a1';
const PROFILE_B = '0196f3a2-0000-7000-8000-0000000000b1';
const NODE_1 = '0000000000000001';
const NODE_2 = '0000000000000002';

let api: TestApi;
let wall = Date.now() - 60_000;

const hlc = (node = NODE_1): string => formatHlc({ wall: (wall += 1), counter: 0, node });
const id = (suffix: number): string =>
  `0196f3a2-0000-7000-8000-${suffix.toString(16).padStart(12, '0')}`;

function push(userId: string | null, mutations: unknown[]) {
  return api.app.inject({
    method: 'POST',
    url: '/api/v1/sync/push',
    headers: userId ? { 'x-dev-user-id': userId } : {},
    payload: { mutations },
  });
}

async function pushOk(userId: string, mutations: SyncMutation[]) {
  const response = await push(userId, mutations);
  expect(response.statusCode, response.body).toBe(200);
  return SyncPushResponseSchema.parse(response.json());
}

async function pull(userId: string, since = 0, limit?: number) {
  const response = await api.app.inject({
    method: 'GET',
    url: `/api/v1/sync/pull?since=${since}${limit ? `&limit=${limit}` : ''}`,
    headers: { 'x-dev-user-id': userId },
  });
  expect(response.statusCode, response.body).toBe(200);
  return SyncPullResponseSchema.parse(response.json());
}

const newCategory = (categoryId: string, name: string, node = NODE_1): SyncMutation => ({
  entity: 'categories',
  id: categoryId,
  op: 'upsert',
  fields: { profileId: PROFILE_A, type: 'expense', name, icon: 'tag', color: '#2D6E85' },
  hlc: hlc(node),
});

beforeAll(async () => {
  api = await startTestApi({ DEV_AUTH: true });
  for (const [userId, profileId, email] of [
    [USER_A, PROFILE_A, 'ana@example.test'],
    [USER_B, PROFILE_B, 'bia@example.test'],
  ] as const) {
    await asUser(api.db.app, userId, async (client) => {
      await client.query(
        `insert into users (id, email, name, wrapped_dek) values ($1, $2, 'Teste', '\\x00')`,
        [userId, email],
      );
    });
    await pushOk(userId, [
      {
        entity: 'profiles',
        id: profileId,
        op: 'upsert',
        fields: { name: 'Pessoal', currency: 'BRL', color: '#2D6E85', icon: 'wallet' },
        hlc: hlc(),
      },
    ]);
  }
}, 180_000);

afterAll(async () => {
  await api?.close();
});

describe('identificação provisória (ADR-0007)', () => {
  it('sem cabeçalho ou com ID inválido responde 401 problem+json', async () => {
    for (const userId of [null, 'nao-e-uuid']) {
      const response = await api.app.inject({
        method: 'GET',
        url: '/api/v1/sync/pull',
        headers: userId ? { 'x-dev-user-id': userId } : {},
      });
      expect(response.statusCode).toBe(401);
      expect(ProblemSchema.parse(response.json()).status).toBe(401);
    }
  });
});

describe('push e pull', () => {
  it('cria, entrega no pull com HLC por campo e avança a versão', async () => {
    const before = await pull(USER_A);
    const category = id(1);
    const result = await pushOk(USER_A, [newCategory(category, 'Lazer')]);
    expect(result.rejected).toEqual([]);
    expect(result.version).toBeGreaterThan(before.version);

    const page = await pull(USER_A, before.version);
    expect(page.version).toBe(result.version);
    expect(page.hasMore).toBe(false);
    expect(page.changes).toEqual([
      expect.objectContaining({
        entity: 'categories',
        id: category,
        version: result.version,
        fields: expect.objectContaining({
          name: 'Lazer',
          type: 'expense',
          isSystem: false,
          deletedAt: null,
          color: '#2D6E85',
        }),
      }),
    ]);
    const clocks = page.changes[0]?.clocks ?? {};
    expect(clocks['name']).toMatch(/-0000000000000001$/);
    expect(await pull(USER_A, result.version)).toEqual({
      changes: [],
      version: result.version,
      hasMore: false,
    });
  });

  it('edições concorrentes em campos diferentes combinam; campo mais antigo perde (F6)', async () => {
    const category = id(2);
    await pushOk(USER_A, [newCategory(category, 'Mercado')]);
    const colorEdit = hlc(NODE_1);
    const nameEdit = hlc(NODE_2);
    const staleName = formatHlc({ wall: wall - 1_000, counter: 0, node: NODE_1 });
    await pushOk(USER_A, [
      {
        entity: 'categories',
        id: category,
        op: 'upsert',
        fields: { name: 'Feira' },
        hlc: nameEdit,
      },
    ]);
    await pushOk(USER_A, [
      {
        entity: 'categories',
        id: category,
        op: 'upsert',
        fields: { color: '#bc4e26', name: 'Antigo' },
        hlc: colorEdit,
      },
      {
        entity: 'categories',
        id: category,
        op: 'upsert',
        fields: { name: 'Velho' },
        hlc: staleName,
      },
    ]);
    const change = (await pull(USER_A)).changes.find((item) => item.id === category);
    expect(change?.fields).toMatchObject({ name: 'Feira', color: '#BC4E26' });
    expect(change?.clocks['name']).toBe(nameEdit);
    expect(change?.clocks['color']).toBe(colorEdit);
  });

  it('exclusão vira tombstone e é entregue no pull', async () => {
    const category = id(3);
    await pushOk(USER_A, [newCategory(category, 'Temporária')]);
    const deletedAt = '2026-11-19T12:00:00.000Z';
    const result = await pushOk(USER_A, [
      { entity: 'categories', id: category, op: 'delete', fields: { deletedAt }, hlc: hlc() },
    ]);
    const page = await pull(USER_A, result.version - 1);
    expect(page.changes.find((item) => item.id === category)?.fields['deletedAt']).toBe(deletedAt);
  });

  it('reenviar o mesmo lote não muda nada (idempotente)', async () => {
    const mutation = newCategory(id(4), 'Idempotente');
    const first = await pushOk(USER_A, [mutation]);
    const second = await pushOk(USER_A, [mutation]);
    expect(second.rejected).toEqual([]);
    expect((await pull(USER_A, first.version)).changes).toEqual([]);
  });
});

describe('mutações recusadas sem derrubar o lote', () => {
  it('nome duplicado (conflict) volta com o estado do servidor; as demais são aplicadas', async () => {
    const original = id(10);
    await pushOk(USER_A, [newCategory(original, 'Saúde')]);
    const result = await pushOk(USER_A, [
      newCategory(id(11), 'SAÚDE'),
      newCategory(id(12), 'Educação'),
      {
        entity: 'categories',
        id: original,
        op: 'upsert',
        fields: { name: 'Educação' },
        hlc: hlc(),
      },
    ]);
    expect(result.rejected).toEqual([
      { index: 0, reason: 'conflict', current: null },
      {
        index: 2,
        reason: 'conflict',
        current: expect.objectContaining({
          id: original,
          fields: expect.objectContaining({ name: 'Saúde' }),
        }),
      },
    ]);
    const names = (await pull(USER_A)).changes.map((change) => change.fields['name']);
    expect(names).toContain('Educação');
    expect(names).not.toContain('SAÚDE');
  });

  it.each([
    ['campo fora da lista (isSystem)', { isSystem: true }, 'invalid'],
    ['valor inválido', { color: 'azul' }, 'invalid'],
    ['tipo não muda depois de criada', { type: 'income' }, 'invalid'],
  ])('%s', async (_, fields, reason) => {
    const category = id(20 + Object.keys(fields).length + String(fields).length);
    await pushOk(USER_A, [newCategory(id(30), 'Base')]);
    const result = await pushOk(USER_A, [
      { entity: 'categories', id: id(30), op: 'upsert', fields, hlc: hlc() },
    ]);
    expect(result.rejected).toEqual([
      expect.objectContaining({
        index: 0,
        reason,
        current: expect.objectContaining({ id: id(30) }),
      }),
    ]);
    expect(category).toBeTruthy();
  });

  it('edição de registro inexistente é not_found; delete sem deletedAt é invalid', async () => {
    const result = await pushOk(USER_A, [
      { entity: 'categories', id: id(40), op: 'upsert', fields: { name: 'Fantasma' }, hlc: hlc() },
      { entity: 'categories', id: id(30), op: 'delete', fields: { name: 'x' }, hlc: hlc() },
    ]);
    expect(result.rejected.map(({ index, reason }) => [index, reason])).toEqual([
      [0, 'not_found'],
      [1, 'invalid'],
    ]);
  });

  it('HLC adiantado demais é recusado (relógio errado não vence sempre)', async () => {
    const future = formatHlc({ wall: Date.now() + 60 * 60 * 1000, counter: 0, node: NODE_1 });
    const result = await pushOk(USER_A, [{ ...newCategory(id(50), 'Futuro'), hlc: future }]);
    expect(result.rejected).toEqual([{ index: 0, reason: 'invalid', current: null }]);
  });

  it('categoria em perfil de outro usuário é recusada (FK composta)', async () => {
    const result = await pushOk(USER_A, [
      {
        ...newCategory(id(60), 'Intrusa'),
        fields: { ...newCategory(id(60), 'x').fields, profileId: PROFILE_B },
      },
    ]);
    expect(result.rejected).toEqual([{ index: 0, reason: 'invalid', current: null }]);
  });

  it('lote mal formado é 422 problem+json', async () => {
    const response = await push(USER_A, [
      { entity: 'users', id: id(70), op: 'upsert', fields: {}, hlc: hlc() },
    ]);
    expect(response.statusCode).toBe(422);
  });
});

describe('isolamento entre usuários (F7, IDOR)', () => {
  it('pull só traz registros do próprio usuário', async () => {
    const page = await pull(USER_B);
    expect(page.changes.map((change) => change.id)).toContain(PROFILE_B);
    for (const change of page.changes) {
      expect(change.entity === 'profiles' ? change.id : change.fields['profileId']).toBe(PROFILE_B);
    }
  });

  it('não sobrescreve nem descobre registro de outro usuário pelo ID', async () => {
    const result = await pushOk(USER_B, [
      {
        entity: 'categories',
        id: id(1),
        op: 'upsert',
        fields: {
          profileId: PROFILE_B,
          type: 'expense',
          name: 'Roubo',
          icon: 'tag',
          color: '#000000',
        },
        hlc: hlc(),
      },
      { entity: 'categories', id: id(1), op: 'upsert', fields: { name: 'Roubo' }, hlc: hlc() },
    ]);
    expect(result.rejected).toEqual([
      { index: 0, reason: 'conflict', current: null },
      { index: 1, reason: 'not_found', current: null },
    ]);
    const owner = (await pull(USER_A)).changes.find((change) => change.id === id(1));
    expect(owner?.fields['name']).toBe('Lazer');
  });
});

describe('paginação do pull', () => {
  it('não divide uma versão entre páginas e percorre tudo pelo cursor', async () => {
    const userId = '0196f3a2-0000-7000-8000-00000000000c';
    const profileId = '0196f3a2-0000-7000-8000-0000000000c1';
    await asUser(api.db.app, userId, (client) =>
      client.query(
        `insert into users (id, email, name, wrapped_dek) values ($1, 'cia@example.test', 'C', '\\x00')`,
        [userId],
      ),
    );
    await pushOk(userId, [
      {
        entity: 'profiles',
        id: profileId,
        op: 'upsert',
        fields: { name: 'P', currency: 'BRL', color: '#2D6E85', icon: 'wallet' },
        hlc: hlc(),
      },
    ]);
    const category = (index: number): SyncMutation => ({
      entity: 'categories',
      id: id(1_000 + index),
      op: 'upsert',
      fields: { profileId, type: 'expense', name: `c${index}`, icon: 'tag', color: '#2D6E85' },
      hlc: hlc(),
    });
    await pushOk(userId, [0, 1, 2].map(category));
    await pushOk(userId, [3, 4].map(category));

    // Limite 2: o perfil nasce com as duas "Outros" na mesma versão, que não cabe e vai inteira.
    const first = await pull(userId, 0, 2);
    expect(first.changes.map((change) => change.entity).sort()).toEqual([
      'categories',
      'categories',
      'profiles',
    ]);
    expect(first.hasMore).toBe(true);
    const second = await pull(userId, first.version, 2);
    expect(second.changes).toHaveLength(3);
    expect(second.hasMore).toBe(true);
    const third = await pull(userId, second.version, 2);
    expect(third.changes).toHaveLength(2);
    expect(third.hasMore).toBe(false);
  });
});
