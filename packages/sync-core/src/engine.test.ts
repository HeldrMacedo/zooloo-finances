import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type MergedChange,
  type OutboxEntry,
  SyncEngine,
  type SyncStore,
  type SyncTransport,
} from './engine.js';
import { HlcClock } from './hlc.js';
import { type FieldValue, mergeRecord, type ReplicaRecord } from './merge.js';
import {
  type Change,
  type Mutation,
  mutationRecord,
  type PullPage,
  type PushResult,
  type Rejection,
} from './protocol.js';

const ENTITY = 'categories';
const key = (entity: string, id: string): string => `${entity}/${id}`;

/** Servidor em memória com a mesma semântica da API: merge por campo e versão por usuário. */
class MemoryServer implements SyncTransport {
  version = 0;
  readonly rows = new Map<
    string,
    { entity: string; id: string; version: number; record: ReplicaRecord }
  >();
  /** Recusa mutações cujo campo `name` seja este valor (simula conflito de unicidade). */
  forbiddenName: string | null = null;
  pushes = 0;

  push(mutations: readonly Mutation[]): Promise<PushResult> {
    this.pushes += 1;
    const rejected: Rejection[] = [];
    this.version += 1;
    mutations.forEach((mutation, index) => {
      const id = key(mutation.entity, mutation.id);
      const current = this.rows.get(id);
      if (mutation.fields['name'] === this.forbiddenName) {
        rejected.push({
          index,
          reason: 'conflict',
          current: current ? this.change(current) : null,
        });
        return;
      }
      const { record, changed } = mergeRecord(current?.record, mutationRecord(mutation));
      if (changed.length > 0) {
        this.rows.set(id, {
          entity: mutation.entity,
          id: mutation.id,
          version: this.version,
          record,
        });
      }
    });
    return Promise.resolve({ version: this.version, rejected });
  }

  pull(since: number, limit: number): Promise<PullPage> {
    const changes = [...this.rows.values()]
      .filter((row) => row.version > since)
      .sort((a, b) => a.version - b.version)
      .slice(0, limit)
      .map((row) => this.change(row));
    const last = changes.at(-1)?.version ?? since;
    const hasMore = [...this.rows.values()].some((row) => row.version > last);
    return Promise.resolve({ changes, version: last, hasMore });
  }

  private change(row: {
    entity: string;
    id: string;
    version: number;
    record: ReplicaRecord;
  }): Change {
    return { entity: row.entity, id: row.id, version: row.version, ...row.record };
  }
}

/** Dispositivo em memória: registros, outbox e cursor. */
class MemoryDevice implements SyncStore {
  readonly records = new Map<string, ReplicaRecord>();
  readonly queue: OutboxEntry[] = [];
  private seq = 0;
  private version = 0;
  readonly clock: HlcClock;
  readonly engine: SyncEngine;

  constructor(node: string, wall: () => number, transport: SyncTransport) {
    this.clock = new HlcClock(node, wall);
    this.engine = new SyncEngine(this, transport, this.clock);
  }

  /** Escrita local: aplica no registro e enfileira a mutação. */
  write(
    id: string,
    fields: Readonly<Record<string, FieldValue>>,
    op: Mutation['op'] = 'upsert',
  ): void {
    const mutation: Mutation = { entity: ENTITY, id, op, fields, hlc: this.clock.next() };
    const current = this.records.get(key(ENTITY, id));
    this.records.set(key(ENTITY, id), mergeRecord(current, mutationRecord(mutation)).record);
    this.seq += 1;
    this.queue.push({ seq: this.seq, mutation });
  }

  fields(id: string) {
    return this.records.get(key(ENTITY, id))?.fields;
  }

  outbox(limit: number): Promise<readonly OutboxEntry[]> {
    return Promise.resolve(this.queue.slice(0, limit));
  }

  acknowledge(seqs: readonly number[]): Promise<void> {
    const done = new Set(seqs);
    this.queue.splice(0, this.queue.length, ...this.queue.filter((entry) => !done.has(entry.seq)));
    return Promise.resolve();
  }

  cursor(): Promise<number> {
    return Promise.resolve(this.version);
  }

  read(entity: string, ids: readonly string[]): Promise<ReadonlyMap<string, ReplicaRecord>> {
    const found = new Map<string, ReplicaRecord>();
    for (const id of ids) {
      const record = this.records.get(key(entity, id));
      if (record) {
        found.set(id, record);
      }
    }
    return Promise.resolve(found);
  }

  apply(changes: readonly MergedChange[], cursor: number): Promise<void> {
    for (const change of changes) {
      this.records.set(key(change.entity, change.id), change.record);
    }
    this.version = cursor;
    return Promise.resolve();
  }

  restore(entity: string, id: string, current: Change | null): Promise<void> {
    if (current) {
      this.records.set(key(entity, id), { fields: current.fields, clocks: current.clocks });
    } else {
      this.records.delete(key(entity, id));
    }
    return Promise.resolve();
  }
}

const NODES = ['00000000000000aa', '00000000000000bb', '00000000000000cc'] as const;

function setup(devices = 2) {
  const server = new MemoryServer();
  let wall = 1_000;
  const tick = () => (wall += 1);
  return {
    server,
    devices: NODES.slice(0, devices).map((node) => new MemoryDevice(node, tick, server)),
  };
}

describe('SyncEngine', () => {
  it('envia o outbox, esvazia a fila e o outro dispositivo recebe no pull', async () => {
    const {
      server,
      devices: [a, b],
    } = setup();
    a!.write('c1', { name: 'Lazer', color: '#2D6E85' });
    const report = await a!.engine.sync();
    expect(report).toMatchObject({ pushed: 1, pulled: 1, rejected: [], version: 1 });
    expect(a!.queue).toHaveLength(0);
    expect((await b!.engine.sync()).pulled).toBe(1);
    expect(b!.fields('c1')).toEqual({ name: 'Lazer', color: '#2D6E85' });
    expect(server.rows.size).toBe(1);
  });

  it('edição offline do mesmo registro em dois dispositivos combina os campos (F6)', async () => {
    const {
      devices: [a, b],
    } = setup();
    a!.write('c1', { name: 'Lazer', color: '#2D6E85' });
    await a!.engine.sync();
    await b!.engine.sync();
    a!.write('c1', { color: '#BC4E26' });
    b!.write('c1', { name: 'Passeios' });
    await a!.engine.sync();
    await b!.engine.sync();
    await a!.engine.sync();
    expect(a!.fields('c1')).toEqual({ name: 'Passeios', color: '#BC4E26' });
    expect(b!.fields('c1')).toEqual(a!.fields('c1'));
  });

  it('exclusão em um dispositivo vence edição anterior do outro', async () => {
    const {
      devices: [a, b],
    } = setup();
    a!.write('c1', { name: 'Lazer' });
    await a!.engine.sync();
    await b!.engine.sync();
    b!.write('c1', { name: 'Passeios' });
    a!.write('c1', { deletedAt: '2026-11-19T12:00:00.000Z' }, 'delete');
    await b!.engine.sync();
    await a!.engine.sync();
    await b!.engine.sync();
    expect(a!.fields('c1')?.['deletedAt']).toBe('2026-11-19T12:00:00.000Z');
    expect(b!.fields('c1')).toEqual(a!.fields('c1'));
  });

  it('escrita local pendente sobrevive a um pull com valor mais antigo', async () => {
    const {
      server,
      devices: [a, b],
    } = setup();
    a!.write('c1', { name: 'Lazer' });
    await a!.engine.sync();
    await b!.engine.sync();
    a!.write('c1', { name: 'Antigo' });
    b!.write('c1', { name: 'Novo' });
    await a!.engine.sync();
    // b ainda não enviou: o pull traz "Antigo", com HLC menor que a escrita pendente.
    const pull = await server.pull(0, 10);
    await b!.apply(
      pull.changes.map((change) => ({
        entity: change.entity,
        id: change.id,
        version: change.version,
        record: mergeRecord(b!.records.get(key(ENTITY, change.id)), change).record,
      })),
      pull.version,
    );
    expect(b!.fields('c1')?.['name']).toBe('Novo');
  });

  it('mutação recusada é desfeita com o estado do servidor ou apagada se não existir lá', async () => {
    const {
      server,
      devices: [a],
    } = setup(1);
    a!.write('c1', { name: 'Lazer' });
    await a!.engine.sync();
    server.forbiddenName = 'Duplicada';
    a!.write('c1', { name: 'Duplicada' });
    a!.write('c2', { name: 'Duplicada' });
    const report = await a!.engine.sync();
    expect(report.rejected.map((r) => [r.index, r.reason, r.mutation.id])).toEqual([
      [0, 'conflict', 'c1'],
      [1, 'conflict', 'c2'],
    ]);
    expect(a!.fields('c1')).toEqual({ name: 'Lazer' });
    expect(a!.fields('c2')).toBeUndefined();
    expect(a!.queue).toHaveLength(0);
  });

  it('envia em lotes de 500 e puxa em páginas de 1.000', async () => {
    const {
      server,
      devices: [a, b],
    } = setup();
    for (let index = 0; index < 1_200; index += 1) {
      a!.write(`c${index}`, { name: `n${index}` });
    }
    const pushed = await a!.engine.sync();
    expect(pushed.pushed).toBe(1_200);
    expect(server.pushes).toBe(3);
    const pulled = await b!.engine.sync();
    expect(pulled.pulled).toBe(1_200);
    expect(b!.records.size).toBe(1_200);
  });

  it('sem nada a fazer, não chama o push e mantém o cursor', async () => {
    const {
      server,
      devices: [a],
    } = setup(1);
    expect(await a!.engine.sync()).toEqual({ pushed: 0, pulled: 0, rejected: [], version: 0 });
    expect(server.pushes).toBe(0);
  });

  it('chamadas simultâneas compartilham o mesmo ciclo', async () => {
    const {
      server,
      devices: [a],
    } = setup(1);
    a!.write('c1', { name: 'Lazer' });
    const [first, second] = await Promise.all([a!.engine.sync(), a!.engine.sync()]);
    expect(second).toBe(first);
    expect(server.pushes).toBe(1);
    a!.write('c2', { name: 'Casa' });
    expect((await a!.engine.sync()).pushed).toBe(1);
  });

  it('observa os HLC recebidos: a próxima escrita local é mais nova que eles', async () => {
    const server = new MemoryServer();
    const slow = new MemoryDevice(NODES[0], () => 1, server);
    const fast = new MemoryDevice(NODES[1], () => 100_000, server);
    fast.write('c1', { name: 'Rápido' });
    await fast.engine.sync();
    await slow.engine.sync();
    slow.write('c1', { name: 'Lento' });
    await slow.engine.sync();
    await fast.engine.sync();
    expect(fast.fields('c1')?.['name']).toBe('Lento');
  });
});

type Op =
  | {
      device: number;
      kind: 'write';
      id: string;
      field: 'name' | 'color' | 'deletedAt';
      value: FieldValue;
    }
  | { device: number; kind: 'sync' };

const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.record({
    device: fc.integer({ min: 0, max: 2 }),
    kind: fc.constant('write' as const),
    id: fc.constantFrom('c1', 'c2', 'c3'),
    field: fc.constantFrom('name' as const, 'color' as const, 'deletedAt' as const),
    value: fc.oneof(fc.constantFrom('a', 'b', 'c'), fc.constant(null)),
  }),
  fc.record({ device: fc.integer({ min: 0, max: 2 }), kind: fc.constant('sync' as const) }),
);

describe('propriedade: dispositivos convergem (RNF-QA-02)', () => {
  it('qualquer intercalação de escritas e syncs termina com todos iguais ao servidor', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(opArb, { maxLength: 40 }), async (ops) => {
        const { server, devices } = setup(3);
        for (const op of ops) {
          const device = devices[op.device]!;
          if (op.kind === 'write') {
            device.write(op.id, { [op.field]: op.value });
          } else {
            await device.engine.sync();
          }
        }
        // Duas rodadas: a primeira envia tudo, a segunda distribui o que os outros enviaram.
        for (let round = 0; round < 2; round += 1) {
          for (const device of devices) {
            await device.engine.sync();
          }
        }
        const expected = new Map([...server.rows].map(([id, row]) => [id, row.record]));
        for (const device of devices) {
          expect(device.queue).toHaveLength(0);
          expect(new Map(device.records)).toEqual(expected);
        }
      }),
      { numRuns: 150 },
    );
  });
});
