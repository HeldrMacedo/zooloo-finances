/// <reference types="node" />
// Roda no Vitest (Node): usa o SQLite do Node como banco local, pelo mesmo driver proxy do Worker.
import { categories, syncMeta } from '@zooloo/db-schema/local';
import {
  type Change,
  formatHlc,
  mergeRecord,
  type Mutation,
  mutationRecord,
  type PullPage,
  type PushResult,
  type Rejection,
  type ReplicaRecord,
  SyncEngine,
  type SyncTransport,
} from '@zooloo/sync-core';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../testing/node-sqlite.js';
import { LocalSyncStore } from './local-store.js';

const USER = '01960000-0000-7000-8111-000000000000';
const PROFILE = '01960000-0000-7000-8121-000000000000';
const CATEGORY = '01960000-0000-7000-8131-000000000000';
const SEED_HLC = '000000000000000-000000-0000000000000000';

/** Servidor mínimo em memória com a semântica da API (merge por campo, versão crescente). */
class FakeServer implements SyncTransport {
  version = 1;
  readonly rows = new Map<string, Change>();
  rejectNames = new Set<string>();

  constructor(initial: Change[] = []) {
    for (const change of initial) {
      this.rows.set(change.id, change);
    }
  }

  push(mutations: readonly Mutation[]): Promise<PushResult> {
    this.version += 1;
    const rejected: Rejection[] = [];
    mutations.forEach((mutation, index) => {
      const current = this.rows.get(mutation.id);
      if (this.rejectNames.has(String(mutation.fields['name']))) {
        rejected.push({ index, reason: 'conflict', current: current ?? null });
        return;
      }
      const base: ReplicaRecord | undefined = current && {
        fields: current.fields,
        clocks: current.clocks,
      };
      const { record } = mergeRecord(base, mutationRecord(mutation));
      this.rows.set(mutation.id, {
        entity: mutation.entity,
        id: mutation.id,
        version: this.version,
        ...record,
      });
    });
    return Promise.resolve({ version: this.version, rejected });
  }

  pull(since: number): Promise<PullPage> {
    const changes = [...this.rows.values()]
      .filter((row) => row.version > since)
      .sort((a, b) => a.version - b.version);
    return Promise.resolve({ changes, version: changes.at(-1)?.version ?? since, hasMore: false });
  }
}

const seed = (): Change[] => {
  const profileFields = {
    name: 'Pessoal',
    currency: 'BRL',
    color: '#2D6E85',
    icon: 'wallet',
    archivedAt: null,
    sortOrder: 0,
    deletedAt: null,
  };
  const categoryFields = {
    profileId: PROFILE,
    type: 'expense',
    name: 'Lazer',
    parentId: null,
    icon: 'tag',
    color: '#2D6E85',
    isSystem: false,
    archivedAt: null,
    sortOrder: 0,
    deletedAt: null,
  };
  const clocks = (fields: object) =>
    Object.fromEntries(Object.keys(fields).map((name) => [name, SEED_HLC]));
  return [
    {
      entity: 'profiles',
      id: PROFILE,
      version: 1,
      fields: profileFields,
      clocks: clocks(profileFields),
    },
    {
      entity: 'categories',
      id: CATEGORY,
      version: 1,
      fields: categoryFields,
      clocks: clocks(categoryFields),
    },
  ];
};

async function device(server: FakeServer, wall: { now: number }) {
  const db = await openDatabase();
  const store = await LocalSyncStore.open(db, USER, () => (wall.now += 1));
  return { db, store, engine: new SyncEngine(store, server, store.clock) };
}

const categoryName = async (db: Awaited<ReturnType<typeof openDatabase>>, id = CATEGORY) =>
  (await db.select().from(categories).where(eq(categories.id, id)))[0];

describe('LocalSyncStore (banco local como réplica)', () => {
  it('primeiro pull grava perfil e categorias respeitando as FKs e guarda o cursor', async () => {
    const server = new FakeServer(seed());
    const { db, store, engine } = await device(server, { now: 1_000 });
    const report = await engine.sync();
    expect(report).toMatchObject({ pushed: 0, pulled: 2, version: 1 });
    expect(await store.cursor()).toBe(1);
    const row = await categoryName(db);
    expect(row).toMatchObject({ name: 'Lazer', userId: USER, serverVersion: 1, isSystem: false });
    expect(row?.fieldHlc['name']).toBe(SEED_HLC);
  });

  it('escrita local vai para o outbox com HLC deste dispositivo e sai ao sincronizar', async () => {
    const server = new FakeServer(seed());
    const { db, store, engine } = await device(server, { now: 1_000 });
    await engine.sync();
    const mutation = await store.write('categories', CATEGORY, { name: 'Passeios' });
    expect(mutation.hlc).toMatch(/^000000000001\d{3}-000000-[0-9a-f]{16}$/);
    expect(await store.pendingCount()).toBe(1);
    expect((await categoryName(db))?.name).toBe('Passeios');
    const report = await engine.sync();
    expect(report.pushed).toBe(1);
    expect(await store.pendingCount()).toBe(0);
    expect(server.rows.get(CATEGORY)?.fields['name']).toBe('Passeios');
  });

  it('dois dispositivos editam campos diferentes offline e convergem (F6)', async () => {
    const server = new FakeServer(seed());
    const wall = { now: 1_000 };
    const a = await device(server, wall);
    const b = await device(server, wall);
    await a.engine.sync();
    await b.engine.sync();
    await a.store.write('categories', CATEGORY, { color: '#BC4E26' });
    await b.store.write('categories', CATEGORY, { name: 'Passeios' });
    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();
    for (const { db } of [a, b]) {
      expect(await categoryName(db)).toMatchObject({ name: 'Passeios', color: '#BC4E26' });
    }
  });

  it('exclusão em um dispositivo chega ao outro como tombstone', async () => {
    const server = new FakeServer(seed());
    const wall = { now: 1_000 };
    const a = await device(server, wall);
    const b = await device(server, wall);
    await a.engine.sync();
    await b.engine.sync();
    await a.store.write(
      'categories',
      CATEGORY,
      { deletedAt: '2026-11-19T12:00:00.000Z' },
      'delete',
    );
    await a.engine.sync();
    await b.engine.sync();
    expect((await categoryName(b.db))?.deletedAt).toBe('2026-11-19T12:00:00.000Z');
  });

  it('mutação recusada: edição volta ao valor do servidor; criação some do banco local', async () => {
    const server = new FakeServer(seed());
    const { db, store, engine } = await device(server, { now: 1_000 });
    await engine.sync();
    server.rejectNames.add('Duplicada');
    server.rejectNames.add('Outra');
    await store.write('categories', CATEGORY, { name: 'Duplicada' });
    const created = '01960000-0000-7000-8139-000000000000';
    await store.write('categories', created, { ...seed()[1]!.fields, name: 'Outra' });
    const report = await engine.sync();
    expect(report.rejected).toHaveLength(2);
    expect((await categoryName(db))?.name).toBe('Lazer');
    expect(await categoryName(db, created)).toBeUndefined();
  });

  it('filha que chega antes da mãe no mesmo lote do pull respeita a FK', async () => {
    const [profile, parent] = seed();
    const child = {
      ...parent!,
      id: '01960000-0000-7000-8132-000000000000',
      fields: { ...parent!.fields, name: 'Cinema', parentId: CATEGORY },
    };
    // Mãe editada depois da filha: versão maior, chega depois no pull.
    const server = new FakeServer([profile!, child, { ...parent!, version: 2 }]);
    const { db, engine } = await device(server, { now: 1_000 });
    await engine.sync();
    expect((await categoryName(db, child.id))?.parentId).toBe(CATEGORY);
  });

  it('recusa em mãe com filha local: volta ao estado do servidor sem quebrar a FK', async () => {
    const server = new FakeServer(seed());
    const { db, store, engine } = await device(server, { now: 1_000 });
    await engine.sync();
    const child = '01960000-0000-7000-8133-000000000000';
    await store.write('categories', child, {
      ...seed()[1]!.fields,
      name: 'Cinema',
      parentId: CATEGORY,
    });
    server.rejectNames.add('Recusada');
    await store.write('categories', CATEGORY, { name: 'Recusada' });
    const report = await engine.sync();
    expect(report.rejected).toHaveLength(1);
    expect((await categoryName(db))?.name).toBe('Lazer');
    expect((await categoryName(db, child))?.parentId).toBe(CATEGORY);
  });

  it('criação recusada leva junto as filhas criadas sob ela no aparelho', async () => {
    const server = new FakeServer(seed());
    const { db, store, engine } = await device(server, { now: 1_000 });
    await engine.sync();
    const parent = '01960000-0000-7000-8134-000000000000';
    const child = '01960000-0000-7000-8135-000000000000';
    server.rejectNames.add('Recusada');
    server.rejectNames.add('Filha');
    await store.write('categories', parent, { ...seed()[1]!.fields, name: 'Recusada' });
    await store.write('categories', child, {
      ...seed()[1]!.fields,
      name: 'Filha',
      parentId: parent,
    });
    const report = await engine.sync();
    expect(report.rejected).toHaveLength(2);
    expect(await categoryName(db, parent)).toBeUndefined();
    expect(await categoryName(db, child)).toBeUndefined();
  });

  it('nó e relógio persistem: reabrir continua depois do último HLC', async () => {
    const server = new FakeServer(seed());
    const wall = { now: 5_000 };
    const db = await openDatabase();
    const first = await LocalSyncStore.open(db, USER, () => wall.now);
    await new SyncEngine(first, server, first.clock).sync();
    const written = await first.write('categories', CATEGORY, { name: 'A' });
    const [node] = await db.select().from(syncMeta).where(eq(syncMeta.key, 'node'));
    const reopened = await LocalSyncStore.open(db, USER, () => 1);
    const next = await reopened.write('categories', CATEGORY, { name: 'B' });
    expect(next.hlc > written.hlc).toBe(true);
    expect(next.hlc.endsWith(node!.value)).toBe(true);
  });

  it('recusa entidade desconhecida', async () => {
    const { store } = await device(new FakeServer(), { now: 1 });
    await expect(store.read('users', ['x'])).rejects.toThrow(/desconhecida/);
  });

  it('HLC remoto entra no relógio local', async () => {
    const future = formatHlc({ wall: 9_000, counter: 3, node: '00000000000000ff' });
    const changes = seed().map((change) => ({
      ...change,
      clocks: Object.fromEntries(Object.keys(change.clocks).map((name) => [name, future])),
    }));
    const { store, engine } = await device(new FakeServer(changes), { now: 1_000 });
    await engine.sync();
    expect((await store.write('categories', CATEGORY, { name: 'Z' })).hlc > future).toBe(true);
  });
});
