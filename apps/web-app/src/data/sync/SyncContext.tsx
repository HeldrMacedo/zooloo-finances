import { type Fields, type MutationOp, SyncEngine, type SyncTransport } from '@zooloo/sync-core';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { currentWallMs } from '../clock.js';
import { useLocalDb, useLocalDbStatus } from '../local-db/LocalDbContext.js';
import { HttpSyncTransport } from './http-transport.js';
import { LocalSyncStore, type SyncedEntity } from './local-store.js';

/**
 * - `unavailable`: sem banco local ou sem usuário; nada é lido nem gravado localmente.
 * - `opening`: abrindo a réplica.
 * - `idle`, `syncing`, `error`: réplica aberta; `error` é a última tentativa de sync que falhou.
 */
export type SyncPhase = 'unavailable' | 'opening' | 'idle' | 'syncing' | 'error';

export interface SyncState {
  readonly phase: SyncPhase;
  /** Mutações no outbox, ainda não aceitas pelo servidor. */
  readonly pending: number;
  /** Sobe a cada escrita local ou sync concluído: quem lê o banco local recarrega. */
  readonly revision: number;
  /** Mutações recusadas pelo servidor e desfeitas aqui, desde o último aviso fechado (TD-020). */
  readonly rejected: number;
}

export interface SyncApi {
  readonly state: SyncState;
  readonly userId: string;
  readonly orm: SqliteRemoteDatabase | null;
  /** Grava no banco local e no outbox e agenda o envio. */
  write(entity: SyncedEntity, id: string, fields: Fields, op?: MutationOp): Promise<void>;
  /** Sincroniza agora (sem rede, só atualiza o estado). */
  syncNow(): Promise<void>;
  dismissRejected(): void;
}

const UNAVAILABLE: SyncState = { phase: 'unavailable', pending: 0, revision: 0, rejected: 0 };
const IDLE: SyncState = { ...UNAVAILABLE, phase: 'idle' };

const SyncContext = createContext<SyncApi>({
  state: UNAVAILABLE,
  userId: '',
  orm: null,
  write: () => Promise.reject(new Error('Banco local indisponível.')),
  syncNow: () => Promise.resolve(),
  dismissRejected: () => undefined,
});

/** Intervalo do sync periódico enquanto não existe tempo real (TD-021). */
export const SYNC_INTERVAL_MS = 30_000;

interface Replica {
  readonly store: LocalSyncStore;
  readonly engine: SyncEngine;
}

interface Opened {
  readonly orm: SqliteRemoteDatabase;
  readonly userId: string;
  readonly transport: SyncTransport;
  /** `null`: a réplica não abriu (banco local com erro). */
  readonly replica: Replica | null;
}

export interface SyncProviderProps {
  /** Banco local; `null` deixa o sync indisponível. */
  readonly orm: SqliteRemoteDatabase | null;
  readonly userId: string;
  readonly transport: SyncTransport;
  readonly intervalMs?: number;
  readonly children: ReactNode;
}

/**
 * Réplica e ciclo de sync do app (ADR-0007, F6): sincroniza ao abrir, ao voltar a rede, ao voltar
 * para a aba, depois de cada escrita e a cada `intervalMs`. Sem rede, as escritas ficam no outbox.
 */
export function SyncProvider({
  orm,
  userId,
  transport,
  intervalMs = SYNC_INTERVAL_MS,
  children,
}: SyncProviderProps) {
  const [opened, setOpened] = useState<Opened | null>(null);
  const [internal, setState] = useState<SyncState>(IDLE);
  const again = useRef(false);
  const running = useRef<Promise<void> | null>(null);
  const enabled = orm !== null && userId !== '';
  // Réplica aberta para outro banco, usuário ou transporte não vale para os atuais.
  const current =
    enabled && opened?.orm === orm && opened.userId === userId && opened.transport === transport
      ? opened
      : null;
  const replica = current?.replica ?? null;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let active = true;
    const key = { orm, userId, transport };
    void LocalSyncStore.open(orm, userId, currentWallMs).then(
      async (store) => {
        const pending = await store.pendingCount();
        if (active) {
          setOpened({
            ...key,
            replica: { store, engine: new SyncEngine(store, transport, store.clock) },
          });
          setState((state) => ({ ...state, phase: 'idle', pending, revision: state.revision + 1 }));
        }
      },
      () => {
        if (active) {
          setOpened({ ...key, replica: null });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [enabled, orm, userId, transport]);

  const state = useMemo<SyncState>(() => {
    if (!current) {
      return enabled ? { ...internal, phase: 'opening' } : UNAVAILABLE;
    }
    return replica ? internal : UNAVAILABLE;
  }, [current, enabled, internal, replica]);

  const syncNow = useCallback((): Promise<void> => {
    if (!replica || !navigator.onLine) {
      return Promise.resolve();
    }
    if (running.current) {
      // Um ciclo em andamento pode já ter lido o outbox: ele dá mais uma volta ao terminar.
      again.current = true;
      return running.current;
    }
    const cycle = async (): Promise<void> => {
      setState((current) => ({ ...current, phase: 'syncing' }));
      let phase: SyncPhase = 'idle';
      let rejected = 0;
      do {
        again.current = false;
        try {
          rejected += (await replica.engine.sync()).rejected.length;
        } catch {
          // Rede ou servidor fora: a fila continua no outbox e o próximo gatilho tenta de novo.
          phase = 'error';
          again.current = false;
        }
      } while (again.current);
      const pending = await replica.store.pendingCount();
      setState((current) => ({
        phase,
        pending,
        revision: current.revision + 1,
        rejected: current.rejected + rejected,
      }));
    };
    running.current = cycle().finally(() => {
      running.current = null;
    });
    return running.current;
  }, [replica]);

  const write = useCallback(
    async (entity: SyncedEntity, id: string, fields: Fields, op?: MutationOp): Promise<void> => {
      if (!replica) {
        throw new Error('Banco local indisponível.');
      }
      await replica.store.write(entity, id, fields, op);
      const pending = await replica.store.pendingCount();
      setState((current) => ({ ...current, pending, revision: current.revision + 1 }));
      void syncNow();
    },
    [replica, syncNow],
  );

  useEffect(() => {
    if (!replica) {
      return undefined;
    }
    void syncNow();
    const onOnline = (): void => void syncNow();
    const onOffline = (): void => setState((current) => ({ ...current, phase: 'idle' }));
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') {
        void syncNow();
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => void syncNow(), intervalMs);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [replica, syncNow, intervalMs]);

  const dismissRejected = useCallback(() => {
    setState((current) => ({ ...current, rejected: 0 }));
  }, []);

  const value = useMemo<SyncApi>(
    () => ({
      state,
      userId,
      orm: replica ? orm : null,
      write,
      syncNow,
      dismissRejected,
    }),
    [state, userId, orm, replica, write, syncNow, dismissRejected],
  );
  return <SyncContext value={value}>{children}</SyncContext>;
}

/** Usuário do seed sintético por cabeçalho provisório, até existir login (ADR-0007, TD-008). */
const DEV_USER = import.meta.env['VITE_ZL_DEV_USER_ID'] ?? '';

/** Sync do app: banco local desta aba e API `/api/v1/sync`. */
export function AppSyncProvider({ children }: { readonly children: ReactNode }) {
  const db = useLocalDb();
  const status = useLocalDbStatus();
  const transport = useMemo(() => new HttpSyncTransport(DEV_USER), []);
  const orm = db && status.role !== 'unavailable' ? db.orm : null;
  return (
    <SyncProvider orm={orm} userId={DEV_USER} transport={transport}>
      {children}
    </SyncProvider>
  );
}

export function useSync(): SyncApi {
  return use(SyncContext);
}
