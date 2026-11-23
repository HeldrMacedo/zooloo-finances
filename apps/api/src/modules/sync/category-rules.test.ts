import { asUser } from '@zooloo/db-schema/testing';
import { compareHlc, formatHlc } from '@zooloo/sync-core';
import {
  type SyncChange,
  type SyncMutation,
  SyncPullResponseSchema,
  SyncPushResponseSchema,
} from '@zooloo/validation';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApi, type TestApi } from '../../testing/test-app.js';

// Regras de categorias no push (RN-CAT-01, 02, 03 e 07), contra PostgreSQL real.
const USER_A = '0196f3a2-0000-7000-8000-0000000000aa';
const USER_B = '0196f3a2-0000-7000-8000-0000000000bb';
const PROFILE_A = '0196f3a2-0000-7000-8000-0000000a0001';
const PROFILE_B = '0196f3a2-0000-7000-8000-0000000b0001';
const NODE_1 = '0000000000000001';
const NODE_2 = '0000000000000002';

let api: TestApi;
let wall = Date.now() - 60_000;
let sequence = 0;

const hlc = (node = NODE_1): string => formatHlc({ wall: (wall += 1), counter: 0, node });
const newId = (): string =>
  `0196f3a2-0000-7000-8000-${(0xc0000 + (sequence += 1)).toString(16).padStart(12, '0')}`;

async function pushOk(userId: string, mutations: SyncMutation[]) {
  const response = await api.app.inject({
    method: 'POST',
    url: '/api/v1/sync/push',
    headers: { 'x-dev-user-id': userId },
    payload: { mutations },
  });
  expect(response.statusCode, response.body).toBe(200);
  return SyncPushResponseSchema.parse(response.json());
}

async function pullAll(userId: string): Promise<SyncChange[]> {
  const response = await api.app.inject({
    method: 'GET',
    url: '/api/v1/sync/pull?since=0',
    headers: { 'x-dev-user-id': userId },
  });
  expect(response.statusCode, response.body).toBe(200);
  return SyncPullResponseSchema.parse(response.json()).changes;
}

async function category(userId: string, id: string): Promise<SyncChange | undefined> {
  return (await pullAll(userId)).find((change) => change.id === id);
}

interface NewCategory {
  readonly name: string;
  readonly type?: 'income' | 'expense';
  readonly parentId?: string | null;
  readonly profileId?: string;
}

const create = (id: string, input: NewCategory, node = NODE_1): SyncMutation => ({
  entity: 'categories',
  id,
  op: 'upsert',
  fields: {
    profileId: input.profileId ?? PROFILE_A,
    type: input.type ?? 'expense',
    name: input.name,
    parentId: input.parentId ?? null,
    icon: 'tag',
    color: '#2D6E85',
  },
  hlc: hlc(node),
});

const edit = (id: string, fields: SyncMutation['fields'], node = NODE_1): SyncMutation => ({
  entity: 'categories',
  id,
  op: 'upsert',
  fields,
  hlc: hlc(node),
});

const remove = (id: string, deletedAt = '2026-11-23T12:00:00.000Z'): SyncMutation => ({
  entity: 'categories',
  id,
  op: 'delete',
  fields: { deletedAt },
  hlc: hlc(),
});

/** Cria e devolve o id; falha o teste se o servidor recusar. */
async function created(input: NewCategory, userId = USER_A): Promise<string> {
  const id = newId();
  const result = await pushOk(userId, [create(id, input)]);
  expect(result.rejected).toEqual([]);
  return id;
}

async function rejection(userId: string, mutation: SyncMutation) {
  const result = await pushOk(userId, [mutation]);
  expect(result.rejected).toHaveLength(1);
  return result.rejected[0];
}

async function systemCategory(userId: string, type: 'income' | 'expense'): Promise<SyncChange> {
  const found = (await pullAll(userId)).find(
    (change) =>
      change.entity === 'categories' &&
      change.fields['isSystem'] === true &&
      change.fields['type'] === type,
  );
  if (!found) {
    throw new Error(`"Outros" de ${type} não encontrada`);
  }
  return found;
}

beforeAll(async () => {
  api = await startTestApi({ DEV_AUTH: true });
  for (const [userId, profileId, email] of [
    [USER_A, PROFILE_A, 'ana@example.test'],
    [USER_B, PROFILE_B, 'bia@example.test'],
  ] as const) {
    await asUser(api.db.app, userId, (client) =>
      client.query(
        `insert into users (id, email, name, wrapped_dek) values ($1, $2, 'Teste', '\\x00')`,
        [userId, email],
      ),
    );
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

describe('"Outros" (RN-CAT-03)', () => {
  it('perfil criado pelo push nasce com uma "Outros" por tipo, na mesma versão', async () => {
    const changes = await pullAll(USER_A);
    const profile = changes.find((change) => change.id === PROFILE_A);
    const others = changes.filter((change) => change.fields['isSystem'] === true);
    expect(others.map((change) => change.fields['type']).sort()).toEqual(['expense', 'income']);
    for (const other of others) {
      expect(other.version).toBe(profile?.version);
      expect(other.fields).toMatchObject({
        profileId: PROFILE_A,
        name: 'Outros',
        parentId: null,
        archivedAt: null,
        deletedAt: null,
      });
    }
  });

  it('reenviar o perfil não cria outras "Outros"', async () => {
    await pushOk(USER_A, [
      {
        entity: 'profiles',
        id: PROFILE_A,
        op: 'upsert',
        fields: { name: 'Pessoal' },
        hlc: hlc(),
      },
    ]);
    const others = (await pullAll(USER_A)).filter((change) => change.fields['isSystem'] === true);
    expect(others).toHaveLength(2);
  });

  it.each([
    ['excluir', (id: string) => remove(id)],
    ['arquivar', (id: string) => edit(id, { archivedAt: '2026-11-23T12:00:00.000Z' })],
    ['renomear', (id: string) => edit(id, { name: 'Diversos' })],
  ])('não pode %s', async (_, mutation) => {
    const other = await systemCategory(USER_A, 'expense');
    const rejected = await rejection(USER_A, mutation(other.id));
    expect(rejected?.reason).toBe('invalid');
    expect(rejected?.current?.fields).toMatchObject({
      name: 'Outros',
      archivedAt: null,
      deletedAt: null,
    });
  });

  it('não vira filha nem recebe filhas', async () => {
    const other = await systemCategory(USER_A, 'expense');
    const parent = await created({ name: 'Moradia' });
    expect((await rejection(USER_A, edit(other.id, { parentId: parent })))?.reason).toBe('invalid');
    expect(
      (await rejection(USER_A, create(newId(), { name: 'Sob Outros', parentId: other.id })))
        ?.reason,
    ).toBe('invalid');
  });

  it('ícone e cor podem mudar', async () => {
    const other = await systemCategory(USER_A, 'income');
    const result = await pushOk(USER_A, [edit(other.id, { icon: 'coins', color: '#18744C' })]);
    expect(result.rejected).toEqual([]);
    expect((await category(USER_A, other.id))?.fields).toMatchObject({
      icon: 'coins',
      color: '#18744C',
      isSystem: true,
    });
  });

  it('outra categoria chamada "Outros" no mesmo nível é conflito', async () => {
    const rejected = await rejection(USER_A, create(newId(), { name: 'OUTROS' }));
    expect(rejected).toEqual({ index: 0, reason: 'conflict', current: null });
  });
});

describe('dois níveis e tipo (RN-CAT-01)', () => {
  it('subcategoria sob mãe de primeiro nível do mesmo tipo é aceita', async () => {
    const parent = await created({ name: 'Transporte' });
    const child = await created({ name: 'Combustível', parentId: parent });
    expect((await category(USER_A, child))?.fields['parentId']).toBe(parent);
  });

  it('neta é recusada', async () => {
    const parent = await created({ name: 'Educação' });
    const child = await created({ name: 'Cursos', parentId: parent });
    const rejected = await rejection(USER_A, create(newId(), { name: 'Idiomas', parentId: child }));
    expect(rejected?.reason).toBe('invalid');
  });

  it('categoria com filhas não vira filha', async () => {
    const parent = await created({ name: 'Pets' });
    await created({ name: 'Ração', parentId: parent });
    const target = await created({ name: 'Família' });
    const rejected = await rejection(USER_A, edit(parent, { parentId: target }));
    expect(rejected?.reason).toBe('invalid');
    expect(rejected?.current?.fields['parentId']).toBeNull();
  });

  it('subcategoria tem o mesmo tipo da mãe', async () => {
    const income = await created({ name: 'Freelas', type: 'income' });
    const rejected = await rejection(USER_A, create(newId(), { name: 'Design', parentId: income }));
    expect(rejected?.reason).toBe('invalid');
  });

  it('mãe inexistente ou excluída é recusada', async () => {
    const missing = await rejection(USER_A, create(newId(), { name: 'Órfã', parentId: newId() }));
    expect(missing?.reason).toBe('invalid');
    const parent = await created({ name: 'Antiga' });
    await pushOk(USER_A, [remove(parent)]);
    const deleted = await rejection(USER_A, create(newId(), { name: 'Tardia', parentId: parent }));
    expect(deleted?.reason).toBe('invalid');
  });

  it('edições concorrentes que formariam 3 níveis: a segunda é recusada e volta ao estado do servidor', async () => {
    const x = await created({ name: 'X concorrente' });
    const y = await created({ name: 'Y concorrente' });
    const z = await created({ name: 'Z concorrente' });
    // Aparelho 1 põe Y sob X; aparelho 2, sem saber, põe Z sob Y.
    const first = await pushOk(USER_A, [edit(y, { parentId: x }, NODE_1)]);
    expect(first.rejected).toEqual([]);
    const second = await rejection(USER_A, edit(z, { parentId: y }, NODE_2));
    expect(second?.reason).toBe('invalid');
    expect(second?.current?.fields['parentId']).toBeNull();
    // Na ordem inversa também não passa: Y já tem filha Z e não pode virar filha.
    const p = await created({ name: 'P concorrente' });
    const q = await created({ name: 'Q concorrente' });
    const r = await created({ name: 'R concorrente' });
    await pushOk(USER_A, [edit(r, { parentId: q }, NODE_2)]);
    expect((await rejection(USER_A, edit(q, { parentId: p }, NODE_1)))?.reason).toBe('invalid');
  });
});

describe('nome único por nível (RN-CAT-07)', () => {
  it('mesmo nome sob mães diferentes é aceito; na mesma mãe, sem diferenciar maiúsculas, é conflito', async () => {
    const home = await created({ name: 'Casa' });
    const car = await created({ name: 'Carro' });
    await created({ name: 'Seguro', parentId: home });
    await created({ name: 'Seguro', parentId: car });
    const rejected = await rejection(USER_A, create(newId(), { name: 'SEGURO', parentId: home }));
    expect(rejected?.reason).toBe('conflict');
  });

  it('mover para mãe onde o nome já existe é conflito', async () => {
    const parent = await created({ name: 'Lazer' });
    await created({ name: 'Cinema', parentId: parent });
    const loose = await created({ name: 'cinema' });
    expect((await rejection(USER_A, edit(loose, { parentId: parent })))?.reason).toBe('conflict');
  });
});

describe('arquivar e excluir (RN-CAT-02)', () => {
  it('arquiva, desarquiva e aceita filha nova sob mãe arquivada (fica arquivada por derivação)', async () => {
    const parent = await created({ name: 'Viagem' });
    const archivedAt = '2026-11-23T10:00:00.000Z';
    expect((await pushOk(USER_A, [edit(parent, { archivedAt })])).rejected).toEqual([]);
    const child = await created({ name: 'Hotel', parentId: parent });
    expect((await category(USER_A, child))?.fields['archivedAt']).toBeNull();
    expect((await pushOk(USER_A, [edit(parent, { archivedAt: null })])).rejected).toEqual([]);
    expect((await category(USER_A, parent))?.fields['archivedAt']).toBeNull();
  });

  it('excluir a mãe exclui na mesma versão as filhas, inclusive as que o cliente não conhecia', async () => {
    const parent = await created({ name: 'Saúde' });
    const known = await created({ name: 'Farmácia', parentId: parent });
    // Outro aparelho cria uma filha que quem exclui ainda não viu.
    const unknown = newId();
    const late = create(unknown, { name: 'Dentista', parentId: parent }, NODE_2);
    await pushOk(USER_A, [late]);
    const deletedAt = '2026-11-23T11:00:00.000Z';
    const result = await pushOk(USER_A, [remove(parent, deletedAt)]);
    expect(result.rejected).toEqual([]);
    for (const child of [known, unknown]) {
      const change = await category(USER_A, child);
      expect(change?.fields['deletedAt']).toBe(deletedAt);
      expect(change?.version).toBe(result.version);
      // O relógio da exclusão fica à frente de todos os campos da filha: nenhuma réplica a mantém viva.
      for (const [name, clock] of Object.entries(change?.clocks ?? {})) {
        if (name !== 'deletedAt') {
          expect(compareHlc(change?.clocks['deletedAt'] ?? '', clock)).toBe(1);
        }
      }
    }
  });

  it('filha já excluída antes não é tocada pela cascata', async () => {
    const parent = await created({ name: 'Assinaturas' });
    const child = await created({ name: 'Streaming', parentId: parent });
    const first = await pushOk(USER_A, [remove(child, '2026-11-23T09:00:00.000Z')]);
    await pushOk(USER_A, [remove(parent)]);
    const change = await category(USER_A, child);
    expect(change?.version).toBe(first.version);
    expect(change?.fields['deletedAt']).toBe('2026-11-23T09:00:00.000Z');
  });

  it('exclusão é definitiva: categoria excluída não volta', async () => {
    const id = await created({ name: 'Efêmera' });
    await pushOk(USER_A, [remove(id)]);
    const rejected = await rejection(USER_A, edit(id, { deletedAt: null }));
    expect(rejected?.reason).toBe('invalid');
    expect(rejected?.current?.fields['deletedAt']).not.toBeNull();
  });

  it('edição antiga de categoria excluída é absorvida sem erro', async () => {
    const id = await created({ name: 'Absorvida' });
    await pushOk(USER_A, [remove(id)]);
    expect((await pushOk(USER_A, [edit(id, { name: 'Renomeada depois' })])).rejected).toEqual([]);
  });
});

describe('isolamento entre usuários (TD-008, IDOR)', () => {
  it('B não lê, não altera, não exclui categoria de A e não a usa como mãe', async () => {
    const victim = await created({ name: 'Privada' });
    const before = await category(USER_A, victim);

    expect((await pullAll(USER_B)).some((change) => change.id === victim)).toBe(false);
    expect(await rejection(USER_B, edit(victim, { name: 'Invadida' }))).toEqual({
      index: 0,
      reason: 'not_found',
      current: null,
    });
    expect(await rejection(USER_B, remove(victim))).toEqual({
      index: 0,
      reason: 'not_found',
      current: null,
    });
    const child = create(newId(), { name: 'Parasita', parentId: victim, profileId: PROFILE_B });
    expect(await rejection(USER_B, child)).toEqual({ index: 0, reason: 'invalid', current: null });

    const after = await category(USER_A, victim);
    expect(after).toEqual(before);
  });

  it('B não mexe na "Outros" de A', async () => {
    const other = await systemCategory(USER_A, 'expense');
    expect((await rejection(USER_B, remove(other.id)))?.reason).toBe('not_found');
    expect((await rejection(USER_B, edit(other.id, { icon: 'skull' })))?.reason).toBe('not_found');
    expect((await category(USER_A, other.id))?.fields['deletedAt']).toBeNull();
  });
});
