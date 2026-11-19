import type { LocalDbEngine } from './coordinator.js';
import type { QueryResult, WorkerRequest, WorkerResponse } from './protocol.js';

export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  onmessage: ((event: { data: WorkerResponse }) => void) | null;
  terminate(): void;
}

/**
 * Motor da aba líder: conversa com o Web Worker do SQLite. Resolve quando o banco abriu e migrou;
 * rejeita se o navegador não oferece OPFS (o app cai no modo online, RN-PWA-05).
 */
export function startWorkerEngine(worker: WorkerLike): Promise<LocalDbEngine> {
  const pending = new Map<
    number,
    { resolve(result: QueryResult): void; reject(error: Error): void }
  >();
  let sequence = 0;

  const call = (build: (id: number) => WorkerRequest): Promise<QueryResult> => {
    sequence += 1;
    const id = sequence;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage(build(id));
    });
  };

  return new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      switch (data.kind) {
        case 'ready':
          resolve({
            storage: data.storage,
            execute: (request) => call((id) => ({ kind: 'query', id, ...request })),
            wipe: async () => {
              await call((id) => ({ kind: 'wipe', id }));
            },
            close: () => worker.terminate(),
          });
          return;
        case 'failed':
          worker.terminate();
          reject(new Error(data.error));
          return;
        default: {
          const item = pending.get(data.id);
          pending.delete(data.id);
          if (data.kind === 'result') {
            item?.resolve(data.result);
          } else {
            item?.reject(new Error(data.error));
          }
        }
      }
    };
  });
}
