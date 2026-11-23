import { act, render, screen, waitFor } from '@testing-library/react';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FakeTransport,
  id,
  PROFILE,
  seededDatabase,
  USER,
} from '../../testing/categories-fixture.js';
import { type SyncApi, SyncProvider, useSync } from './SyncContext.js';

const probe: { api: SyncApi | undefined } = { api: undefined };

function Probe() {
  const api = useSync();
  useEffect(() => {
    probe.api = api;
  });
  return (
    <p>
      {api.state.phase} · {api.state.pending} · {api.orm ? 'orm' : 'sem orm'}
    </p>
  );
}

const sync = (): SyncApi => {
  const { api } = probe;
  if (!api) {
    throw new Error('provider não montou');
  }
  return api;
};

function mount(orm: SqliteRemoteDatabase | null, transport: FakeTransport, intervalMs?: number) {
  return render(
    <SyncProvider
      orm={orm}
      userId={USER}
      transport={transport}
      {...(intervalMs ? { intervalMs } : {})}
    >
      <Probe />
    </SyncProvider>,
  );
}

const category = (name: string) => ({
  profileId: PROFILE,
  type: 'expense',
  name,
  parentId: null,
  icon: 'tag',
  color: '#2D6E85',
  archivedAt: null,
  sortOrder: 9,
});

const pulls = (transport: FakeTransport) => vi.spyOn(transport, 'pull');

afterEach(() => {
  probe.api = undefined;
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'onLine');
  Reflect.deleteProperty(document, 'visibilityState');
});

describe('SyncProvider (F6)', () => {
  it('sem banco local fica indisponível e recusa escrita', async () => {
    mount(null, new FakeTransport());
    expect(screen.getByText('unavailable · 0 · sem orm')).toBeDefined();
    await expect(sync().write('categories', 'x', { name: 'A' })).rejects.toThrow(
      'Banco local indisponível.',
    );
    await expect(sync().syncNow()).resolves.toBeUndefined();
  });

  it('banco que não abre deixa o sync indisponível', async () => {
    const broken = {
      all: () => Promise.reject(new Error('banco corrompido')),
      run: () => Promise.reject(new Error('banco corrompido')),
      get: () => Promise.reject(new Error('banco corrompido')),
      values: () => Promise.reject(new Error('banco corrompido')),
      select: () => {
        throw new Error('banco corrompido');
      },
      insert: () => {
        throw new Error('banco corrompido');
      },
      transaction: () => Promise.reject(new Error('banco corrompido')),
    } as unknown as SqliteRemoteDatabase;
    mount(broken, new FakeTransport());
    expect(screen.getByText('opening · 0 · sem orm')).toBeDefined();
    expect(await screen.findByText('unavailable · 0 · sem orm')).toBeDefined();
  });

  it('sincroniza ao abrir, ao voltar para a aba e a cada intervalo; offline volta a ocioso', async () => {
    const transport = new FakeTransport();
    const pull = pulls(transport);
    mount(await seededDatabase(), transport, 50);
    expect(await screen.findByText('idle · 0 · orm')).toBeDefined();
    await waitFor(() => expect(pull).toHaveBeenCalled());

    const before = pull.mock.calls.length;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(pull.mock.calls.length).toBeGreaterThan(before));

    const afterVisible = pull.mock.calls.length;
    await waitFor(() => expect(pull.mock.calls.length).toBeGreaterThan(afterVisible + 1));

    transport.failing = true;
    await waitFor(() => expect(screen.getByText('error · 0 · orm')).toBeDefined());
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText('idle · 0 · orm')).toBeDefined();
  });

  it('escrita durante um ciclo dá mais uma volta e envia tudo', async () => {
    const transport = new FakeTransport();
    mount(await seededDatabase(), transport);
    await screen.findByText('idle · 0 · orm');
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const push = transport.push.bind(transport);
    vi.spyOn(transport, 'push').mockImplementationOnce(async (mutations) => {
      await gate;
      return push(mutations);
    });
    await act(async () => {
      await sync().write('categories', id(21), category('Primeira'));
    });
    await act(async () => {
      await sync().write('categories', id(22), category('Segunda'));
    });
    expect(screen.getByText(/syncing · 2/)).toBeDefined();
    await act(async () => {
      release();
      await sync().syncNow();
    });
    await waitFor(() => expect(screen.getByText('idle · 0 · orm')).toBeDefined());
    expect(transport.pushed.map((m) => m.fields['name'])).toEqual(['Primeira', 'Segunda']);
  });
});
