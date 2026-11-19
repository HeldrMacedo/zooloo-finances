import { describe, expect, it, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from './protocol.js';
import { startWorkerEngine, type WorkerLike } from './worker-engine.js';

function fakeWorker(answer: (request: WorkerRequest) => WorkerResponse) {
  const worker: WorkerLike = {
    onmessage: null,
    postMessage: (request) => {
      queueMicrotask(() => worker.onmessage?.({ data: answer(request) }));
    },
    terminate: vi.fn(),
  };
  return worker;
}

const storage = { vfs: 'zooloo-sahpool', file: '/zooloo.sqlite3', migrated: ['0000_init'] };

describe('startWorkerEngine', () => {
  it('resolve quando o Worker abre o banco e encaminha consultas e wipe', async () => {
    const worker = fakeWorker((request) =>
      request.kind === 'query' && request.sql === 'ERRO'
        ? { kind: 'error', id: request.id, error: 'no such table' }
        : { kind: 'result', id: request.id, result: { rows: [[request.kind]] } },
    );
    const engine = startWorkerEngine(worker);
    worker.onmessage?.({ data: { kind: 'ready', storage } });
    const ready = await engine;
    expect(ready.storage).toEqual(storage);
    expect(await ready.execute({ sql: 'SELECT 1', params: [], method: 'all' })).toEqual({
      rows: [['query']],
    });
    await expect(ready.execute({ sql: 'ERRO', params: [], method: 'run' })).rejects.toThrow(
      'no such table',
    );
    await ready.wipe();
    ready.close();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('rejeita e encerra o Worker quando o banco não abre', async () => {
    const worker = fakeWorker(() => ({ kind: 'failed', error: 'x' }));
    const engine = startWorkerEngine(worker);
    worker.onmessage?.({ data: { kind: 'failed', error: 'OPFS indisponível' } });
    await expect(engine).rejects.toThrow('OPFS indisponível');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
