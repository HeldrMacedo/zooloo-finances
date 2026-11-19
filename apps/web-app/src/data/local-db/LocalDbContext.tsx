import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { createContext, type ReactNode, use, useMemo, useSyncExternalStore } from 'react';
import type { LocalDbCoordinator, LocalDbStatus } from './coordinator.js';

export interface LocalDb {
  readonly coordinator: LocalDbCoordinator;
  /** Drizzle sobre o driver proxy: a consulta vai ao Worker da aba líder (doc 09 §4). */
  readonly orm: SqliteRemoteDatabase;
}

const LocalDbContext = createContext<LocalDb | null>(null);

export function LocalDbProvider({
  coordinator,
  children,
}: {
  readonly coordinator: LocalDbCoordinator | null;
  readonly children: ReactNode;
}) {
  const value = useMemo(
    () =>
      coordinator && {
        coordinator,
        orm: drizzle(async (sql, params, method) => coordinator.query({ sql, params, method })),
      },
    [coordinator],
  );
  return <LocalDbContext value={value}>{children}</LocalDbContext>;
}

/** Banco local desta aba; `null` quando o app roda sem ele (testes, navegador sem suporte). */
export function useLocalDb(): LocalDb | null {
  return use(LocalDbContext);
}

const NO_STATUS: LocalDbStatus = { role: 'unavailable', error: 'Banco local não iniciado.' };

export function useLocalDbStatus(): LocalDbStatus {
  const db = useLocalDb();
  return useSyncExternalStore(
    (onChange) => db?.coordinator.subscribe(onChange) ?? (() => undefined),
    () => db?.coordinator.status ?? NO_STATUS,
  );
}
