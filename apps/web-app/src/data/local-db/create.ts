import { LocalDbCoordinator } from './coordinator.js';
import type { TabMessage } from './protocol.js';
import { startWorkerEngine, type WorkerLike } from './worker-engine.js';

/** Liga o coordenador às APIs reais do navegador. Chamado uma vez por aba, em `main.tsx`. */
export function createBrowserLocalDb(): LocalDbCoordinator {
  const channel = new BroadcastChannel('zooloo-local-db');
  const coordinator = new LocalDbCoordinator({
    tabId: crypto.randomUUID(),
    channel: {
      postMessage: (message: TabMessage) => channel.postMessage(message),
      set onmessage(handler: ((event: { data: unknown }) => void) | null) {
        channel.onmessage = handler;
      },
      get onmessage() {
        return channel.onmessage as ((event: { data: unknown }) => void) | null;
      },
      close: () => channel.close(),
    },
    requestLock: (name, onAcquired) => navigator.locks.request(name, onAcquired),
    startEngine: () =>
      startWorkerEngine(
        new Worker(new URL('./db.worker.ts', import.meta.url), {
          type: 'module',
          name: 'zooloo-local-db',
        }) as unknown as WorkerLike,
      ),
  });
  coordinator.start();
  return coordinator;
}
