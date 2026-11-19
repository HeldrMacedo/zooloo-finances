import {
  isTabMessage,
  type QueryRequest,
  type QueryResult,
  type StorageInfo,
  type TabMessage,
} from './protocol.js';

/** Motor do banco: só existe na aba líder (Web Worker com SQLite em OPFS). */
export interface LocalDbEngine {
  readonly storage: StorageInfo;
  execute(request: QueryRequest): Promise<QueryResult>;
  wipe(): Promise<void>;
  close(): void;
}

export interface TabChannel {
  postMessage(message: TabMessage): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  close(): void;
}

export interface CoordinatorDeps {
  readonly tabId: string;
  /** `navigator.locks.request`: resolve o callback quando a trava for desta aba. */
  readonly requestLock: (name: string, onAcquired: () => Promise<void>) => Promise<unknown>;
  readonly channel: TabChannel;
  readonly startEngine: () => Promise<LocalDbEngine>;
}

export type LocalDbStatus =
  | { readonly role: 'follower'; readonly leader: string | null }
  | { readonly role: 'leader'; readonly storage: StorageInfo }
  | { readonly role: 'unavailable'; readonly error: string };

const LOCK_NAME = 'zooloo-local-db';

interface Pending {
  readonly request: QueryRequest;
  resolve(result: QueryResult): void;
  reject(error: Error): void;
}

/**
 * Uma só aba abre o SQLite (o VFS `opfs-sahpool` não aceita duas, RNF-PWA-06). A líder é eleita pela
 * Web Locks API; as demais mandam consultas a ela pelo BroadcastChannel. Quando a líder fecha, a
 * trava é liberada, outra aba assume e reenvia o que estava pendente.
 *
 * Reenvio pode repetir uma escrita que a líder antiga gravou mas não respondeu; por isso escritas
 * locais usam IDs gerados no cliente e são idempotentes (RNF-SYN-02).
 */
export class LocalDbCoordinator {
  private engine: LocalDbEngine | null = null;
  private knownLeader: string | null = null;
  private current: LocalDbStatus = { role: 'follower', leader: null };
  private readonly pending = new Map<string, Pending>();
  private readonly listeners = new Set<(status: LocalDbStatus) => void>();
  private releaseLock: (() => void) | null = null;
  private sequence = 0;

  constructor(private readonly deps: CoordinatorDeps) {}

  get status(): LocalDbStatus {
    return this.current;
  }

  subscribe(listener: (status: LocalDbStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    this.deps.channel.onmessage = (event) => {
      if (isTabMessage(event.data)) {
        void this.onMessage(event.data);
      }
    };
    this.deps.channel.postMessage({ kind: 'hello', from: this.deps.tabId });
    void this.deps.requestLock(LOCK_NAME, () => this.lead());
  }

  /** Consulta pelo driver `sqlite-proxy`. Espera existir uma líder. */
  query(request: QueryRequest): Promise<QueryResult> {
    if (this.engine) {
      return this.engine.execute(request);
    }
    if (this.current.role === 'unavailable') {
      return Promise.reject(new Error(this.current.error));
    }
    this.sequence += 1;
    const id = `${this.deps.tabId}:${this.sequence}`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { request, resolve, reject });
      this.send(id, request);
    });
  }

  /** Apaga o banco local (logout sem "manter dados", remote wipe). Só a líder executa. */
  async wipe(): Promise<void> {
    if (!this.engine) {
      throw new Error('Só a aba líder apaga o banco local.');
    }
    await this.engine.wipe();
  }

  stop(): void {
    this.deps.channel.onmessage = null;
    this.deps.channel.close();
    this.engine?.close();
    this.engine = null;
    this.releaseLock?.();
    for (const [id, item] of this.pending) {
      item.reject(new Error('Banco local encerrado.'));
      this.pending.delete(id);
    }
  }

  private async lead(): Promise<void> {
    try {
      this.engine = await this.deps.startEngine();
    } catch (error) {
      this.setStatus({ role: 'unavailable', error: String(error) });
      for (const [id, item] of this.pending) {
        item.reject(new Error(String(error)));
        this.pending.delete(id);
      }
      return;
    }
    this.knownLeader = this.deps.tabId;
    this.setStatus({ role: 'leader', storage: this.engine.storage });
    this.deps.channel.postMessage({ kind: 'leader', tabId: this.deps.tabId });
    for (const [id, item] of this.pending) {
      this.pending.delete(id);
      this.engine.execute(item.request).then(item.resolve, item.reject);
    }
    // Segura a trava enquanto a aba existir; liberada em stop() ou quando a aba fecha.
    await new Promise<void>((resolve) => {
      this.releaseLock = resolve;
    });
  }

  private async onMessage(message: TabMessage): Promise<void> {
    switch (message.kind) {
      case 'hello':
        if (this.engine) {
          this.deps.channel.postMessage({ kind: 'leader', tabId: this.deps.tabId });
        }
        return;
      case 'leader':
        if (message.tabId !== this.knownLeader && !this.engine) {
          this.knownLeader = message.tabId;
          this.setStatus({ role: 'follower', leader: message.tabId });
          for (const [id, item] of this.pending) {
            this.send(id, item.request);
          }
        }
        return;
      case 'request':
        if (this.engine) {
          await this.answer(message);
        }
        return;
      case 'response': {
        const item = message.to === this.deps.tabId ? this.pending.get(message.id) : undefined;
        if (!item) {
          return;
        }
        this.pending.delete(message.id);
        if (message.error !== undefined) {
          item.reject(new Error(message.error));
        } else {
          item.resolve(message.result ?? { rows: [] });
        }
      }
    }
  }

  private async answer(message: Extract<TabMessage, { kind: 'request' }>): Promise<void> {
    const { id, from, sql, params, method } = message;
    try {
      const result = await (this.engine as LocalDbEngine).execute({ sql, params, method });
      this.deps.channel.postMessage({ kind: 'response', id, to: from, result });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      this.deps.channel.postMessage({ kind: 'response', id, to: from, error: text });
    }
  }

  private send(id: string, request: QueryRequest): void {
    this.deps.channel.postMessage({ kind: 'request', id, from: this.deps.tabId, ...request });
  }

  private setStatus(status: LocalDbStatus): void {
    this.current = status;
    for (const listener of this.listeners) {
      listener(status);
    }
  }
}
