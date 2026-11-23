import { describe, expect, it, vi } from 'vitest';
import { type LocalDbEngine, LocalDbCoordinator, type TabChannel } from './coordinator.js';
import type { QueryRequest, TabMessage } from './protocol.js';

/** Hub que imita o BroadcastChannel: entrega a todos os outros, nunca ao remetente, assíncrono. */
class Hub {
  private readonly members = new Set<TabChannel>();

  join(): TabChannel {
    const members = this.members;
    const channel: TabChannel = {
      onmessage: null,
      postMessage(message: TabMessage) {
        for (const other of members) {
          if (other !== channel) {
            queueMicrotask(() => other.onmessage?.({ data: structuredClone(message) }));
          }
        }
      },
      close() {
        members.delete(channel);
      },
    };
    this.members.add(channel);
    return channel;
  }
}

/** Imita a Web Locks API: fila FIFO, uma dona por vez. */
class Locks {
  private queue: (() => Promise<void>)[] = [];
  private busy = false;

  request = (_name: string, onAcquired: () => Promise<void>): Promise<void> =>
    new Promise((resolve) => {
      this.queue.push(async () => {
        await onAcquired();
        resolve();
      });
      void this.next();
    });

  private async next(): Promise<void> {
    if (this.busy) {
      return;
    }
    const job = this.queue.shift();
    if (!job) {
      return;
    }
    this.busy = true;
    await job();
    this.busy = false;
    void this.next();
  }
}

/** Banco em memória compartilhado entre "motores": simula o arquivo em OPFS. */
function sharedStore() {
  const rows: string[] = [];
  const executed: QueryRequest[] = [];
  const engine = (): LocalDbEngine => ({
    storage: {
      vfs: 'opfs-sahpool',
      file: '/zooloo.sqlite3',
      migrated: [],
      cipher: 'sqlcipher',
      recreated: false,
    },
    async execute(request) {
      executed.push(request);
      if (request.sql.startsWith('INSERT')) {
        rows.push(String(request.params[0]));
        return { rows: [] };
      }
      if (request.sql === 'FALHA') {
        throw new Error('erro de SQL');
      }
      return { rows: rows.map((value) => [value]) };
    },
    async wipe() {
      rows.length = 0;
    },
    close: vi.fn(),
  });
  return { rows, executed, engine };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const insert = (value: string): QueryRequest => ({
  sql: 'INSERT INTO t VALUES (?)',
  params: [value],
  method: 'run',
});
const select: QueryRequest = { sql: 'SELECT * FROM t', params: [], method: 'all' };

function tab(id: string, hub: Hub, locks: Locks, startEngine: () => Promise<LocalDbEngine>) {
  const coordinator = new LocalDbCoordinator({
    tabId: id,
    channel: hub.join(),
    requestLock: locks.request,
    startEngine,
  });
  coordinator.start();
  return coordinator;
}

describe('LocalDbCoordinator (RNF-PWA-06, F6)', () => {
  it('a primeira aba vira líder e executa no próprio motor', async () => {
    const store = sharedStore();
    const a = tab('a', new Hub(), new Locks(), async () => store.engine());
    await flush();
    expect(a.status).toMatchObject({ role: 'leader', storage: { vfs: 'opfs-sahpool' } });
    await a.query(insert('x'));
    expect(await a.query(select)).toEqual({ rows: [['x']] });
  });

  it('a segunda aba é seguidora e consulta pela líder', async () => {
    const store = sharedStore();
    const hub = new Hub();
    const locks = new Locks();
    const a = tab('a', hub, locks, async () => store.engine());
    await flush();
    const b = tab('b', hub, locks, async () => store.engine());
    await flush();
    expect(b.status).toEqual({ role: 'follower', leader: 'a' });
    await b.query(insert('de-b'));
    expect(await a.query(select)).toEqual({ rows: [['de-b']] });
    expect(await b.query(select)).toEqual({ rows: [['de-b']] });
  });

  it('erro na líder chega à seguidora como erro', async () => {
    const store = sharedStore();
    const hub = new Hub();
    const locks = new Locks();
    tab('a', hub, locks, async () => store.engine());
    await flush();
    const b = tab('b', hub, locks, async () => store.engine());
    await flush();
    await expect(b.query({ sql: 'FALHA', params: [], method: 'run' })).rejects.toThrow(
      'erro de SQL',
    );
  });

  it('consulta feita antes de existir líder espera e é atendida quando a líder surge', async () => {
    const store = sharedStore();
    const hub = new Hub();
    const locks = new Locks();
    let release: () => void = () => undefined;
    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });
    const a = tab('a', hub, locks, async () => {
      await blocker;
      return store.engine();
    });
    const pending = a.query(insert('cedo'));
    release();
    await pending;
    expect(store.rows).toEqual(['cedo']);
  });

  it('quando a líder fecha, outra assume sem perder dados nem pendências', async () => {
    const store = sharedStore();
    const hub = new Hub();
    const locks = new Locks();
    const a = tab('a', hub, locks, async () => store.engine());
    await flush();
    const b = tab('b', hub, locks, async () => store.engine());
    await flush();
    await b.query(insert('antes'));
    a.stop();
    await flush();
    expect(b.status).toMatchObject({ role: 'leader' });
    await b.query(insert('depois'));
    expect(await b.query(select)).toEqual({ rows: [['antes'], ['depois']] });
  });

  it('pedido feito durante a troca de líder é atendido pela nova líder', async () => {
    const store = sharedStore();
    const hub = new Hub();
    const locks = new Locks();
    const a = tab('a', hub, locks, async () => store.engine());
    await flush();
    const b = tab('b', hub, locks, async () => store.engine());
    const c = tab('c', hub, locks, async () => store.engine());
    await flush();
    // A líder some antes de responder: o canal dela é fechado sem atender.
    a.stop();
    const result = c.query(insert('em-voo'));
    await flush();
    await result;
    expect(b.status).toMatchObject({ role: 'leader' });
    expect(store.rows).toContain('em-voo');
  });

  it('nova aba que chega não faz as outras reenviarem (sem escrita duplicada)', async () => {
    const store = sharedStore();
    const hub = new Hub();
    const locks = new Locks();
    tab('a', hub, locks, async () => store.engine());
    await flush();
    const b = tab('b', hub, locks, async () => store.engine());
    await flush();
    const write = b.query(insert('uma-vez'));
    tab('c', hub, locks, async () => store.engine());
    await write;
    await flush();
    expect(store.rows).toEqual(['uma-vez']);
  });

  it('sem OPFS o banco fica indisponível e avisa quem espera (RN-PWA-05)', async () => {
    const a = tab('a', new Hub(), new Locks(), async () => {
      throw new Error('OPFS indisponível');
    });
    const waiting = a.query(select);
    await expect(waiting).rejects.toThrow('OPFS indisponível');
    expect(a.status).toEqual({ role: 'unavailable', error: 'Error: OPFS indisponível' });
    await expect(a.query(select)).rejects.toThrow('OPFS indisponível');
  });

  it('notifica mudanças de papel e para de notificar após cancelar', async () => {
    const store = sharedStore();
    const listener = vi.fn();
    const hub = new Hub();
    const locks = new Locks();
    const a = new LocalDbCoordinator({
      tabId: 'a',
      channel: hub.join(),
      requestLock: locks.request,
      startEngine: async () => store.engine(),
    });
    const unsubscribe = a.subscribe(listener);
    a.start();
    await flush();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ role: 'leader' }));
    unsubscribe();
    a.stop();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('só a líder apaga o banco; stop rejeita pendências da seguidora', async () => {
    const store = sharedStore();
    const hub = new Hub();
    const locks = new Locks();
    const a = tab('a', hub, locks, async () => store.engine());
    await flush();
    const b = tab('b', hub, locks, async () => store.engine());
    await flush();
    await a.query(insert('x'));
    await expect(b.wipe()).rejects.toThrow('Só a aba líder');
    await a.wipe();
    expect(store.rows).toEqual([]);
    a.stop();
    const orphan = new LocalDbCoordinator({
      tabId: 'z',
      channel: new Hub().join(),
      requestLock: () => new Promise(() => undefined),
      startEngine: async () => store.engine(),
    });
    orphan.start();
    const waiting = orphan.query(select);
    orphan.stop();
    await expect(waiting).rejects.toThrow('Banco local encerrado.');
  });

  it('ignora mensagens que não são do protocolo e respostas para outras abas', async () => {
    const store = sharedStore();
    const hub = new Hub();
    const locks = new Locks();
    tab('a', hub, locks, async () => store.engine());
    await flush();
    const spy = hub.join();
    const b = tab('b', hub, locks, async () => store.engine());
    await flush();
    spy.postMessage({ kind: 'response', id: 'b:1', to: 'outra', result: { rows: [] } });
    (spy as unknown as { postMessage(m: unknown): void }).postMessage({ qualquer: true });
    await flush();
    expect(await b.query(select)).toEqual({ rows: [] });
  });
});
