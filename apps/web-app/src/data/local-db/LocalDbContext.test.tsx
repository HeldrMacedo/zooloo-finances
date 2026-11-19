import { render, screen, waitFor } from '@testing-library/react';
import { categories } from '@zooloo/db-schema/local';
import { count } from 'drizzle-orm';
import { useEffect, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { LocalDbCoordinator, type LocalDbEngine, type TabChannel } from './coordinator.js';
import { LocalDbProvider, useLocalDb, useLocalDbStatus } from './LocalDbContext.js';
import type { QueryRequest } from './protocol.js';

function coordinatorWith(execute: (request: QueryRequest) => unknown[]) {
  const channel: TabChannel = {
    onmessage: null,
    postMessage: () => undefined,
    close: () => undefined,
  };
  const engine: LocalDbEngine = {
    storage: { vfs: 'zooloo-sahpool', file: '/zooloo.sqlite3', migrated: [] },
    execute: async (request) => ({ rows: execute(request) }),
    wipe: async () => undefined,
    close: () => undefined,
  };
  return new LocalDbCoordinator({
    tabId: 't',
    channel,
    requestLock: (_name, onAcquired) => onAcquired(),
    startEngine: async () => engine,
  });
}

function Probe() {
  const db = useLocalDb();
  const status = useLocalDbStatus();
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    if (db && status.role === 'leader') {
      void db.orm
        .select({ total: count() })
        .from(categories)
        .then(([row]) => setTotal(row?.total ?? 0));
    }
  }, [db, status.role]);
  return (
    <p>
      {status.role}:{total ?? '-'}
    </p>
  );
}

describe('LocalDbProvider', () => {
  it('expõe Drizzle sobre o coordenador e o papel da aba', async () => {
    const seen: QueryRequest[] = [];
    const coordinator = coordinatorWith((request) => {
      seen.push(request);
      return request.method === 'get' ? [7] : [[7]];
    });
    coordinator.start();
    render(
      <LocalDbProvider coordinator={coordinator}>
        <Probe />
      </LocalDbProvider>,
    );
    await waitFor(() => expect(screen.getByText('leader:7')).toBeDefined());
    expect(seen[0]?.sql).toMatch(/select count\(\*\) from "categories"/i);
    expect(seen[0]?.method).toBe('all');
  });

  it('sem coordenador: banco indisponível e hook devolve null', () => {
    render(
      <LocalDbProvider coordinator={null}>
        <Probe />
      </LocalDbProvider>,
    );
    expect(screen.getByText('unavailable:-')).toBeDefined();
  });
});
