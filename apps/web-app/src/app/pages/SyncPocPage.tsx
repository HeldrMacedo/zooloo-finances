import { categories, profiles } from '@zooloo/db-schema/local';
import { SyncEngine, type SyncReport } from '@zooloo/sync-core';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { currentWallMs, nowIso } from '../../data/clock.js';
import { uuidv7 } from '../../data/ids.js';
import { type LocalDb, useLocalDb, useLocalDbStatus } from '../../data/local-db/LocalDbContext.js';
import { HttpSyncTransport } from '../../data/sync/http-transport.js';
import { LocalSyncStore } from '../../data/sync/local-store.js';
import { Button } from '../../ui/button/Button.js';
import { Card } from '../../ui/card/Card.js';
import { TextField } from '../../ui/field/TextField.js';
import { useOnline } from '../../ui/sync/SyncStatus.js';
import pages from './pages.module.css';

/**
 * PoC 2 (doc 09 §8, ADR-0007): categorias sincronizadas entre dispositivos pela API, com edição
 * concorrente e exclusão. Só em desenvolvimento e no build de E2E. O usuário vem do seed sintético
 * por cabeçalho provisório, até existir login.
 */
const DEFAULT_USER = import.meta.env['VITE_ZL_DEV_USER_ID'] ?? '';

interface Replica {
  readonly store: LocalSyncStore;
  readonly engine: SyncEngine;
}

interface Row {
  readonly id: string;
  readonly name: string;
}

async function openReplica(db: LocalDb, userId: string): Promise<Replica> {
  const store = await LocalSyncStore.open(db.orm, userId, currentWallMs);
  return { store, engine: new SyncEngine(store, new HttpSyncTransport(userId), store.clock) };
}

async function loadRows(
  db: LocalDb,
  userId: string,
): Promise<{ profileId: string | null; rows: Row[] }> {
  const [profile] = await db.orm
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.userId, userId), isNull(profiles.deletedAt)))
    .orderBy(asc(profiles.createdAt))
    .limit(1);
  const rows = await db.orm
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.userId, userId), isNull(categories.deletedAt)))
    .orderBy(asc(categories.name));
  return { profileId: profile?.id ?? null, rows };
}

function describe(report: SyncReport): string {
  const rejected = report.rejected.length;
  return `Sincronizado: ${report.pushed} enviadas, ${report.pulled} recebidas${
    rejected > 0
      ? `, ${rejected} recusadas (${report.rejected.map((r) => r.reason).join(', ')})`
      : ''
  }. Versão ${report.version}.`;
}

function CategoryRow({
  row,
  onRename,
  onDelete,
}: {
  readonly row: Row;
  readonly onRename: (name: string) => void;
  readonly onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);
  return (
    <li className={pages.actions}>
      <TextField
        label={`Nome de ${row.name}`}
        hideLabel
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button
        size="sm"
        onClick={() => onRename(name)}
        disabled={name.trim() === '' || name === row.name}
      >
        Renomear {row.name}
      </Button>
      <Button size="sm" variant="danger" onClick={onDelete}>
        Excluir {row.name}
      </Button>
    </li>
  );
}

export function SyncPocPage() {
  const db = useLocalDb();
  const status = useLocalDbStatus();
  const online = useOnline();
  const [userId] = useState(DEFAULT_USER);
  const [replica, setReplica] = useState<Replica | null>(null);
  const [data, setData] = useState<{ profileId: string | null; rows: Row[] }>({
    profileId: null,
    rows: [],
  });
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState('');
  const [newName, setNewName] = useState('');

  const ready = db !== null && status.role !== 'unavailable' && userId !== '';

  const refresh = useCallback(async () => {
    if (db && replica) {
      setData(await loadRows(db, userId));
      setPending(await replica.store.pendingCount());
    }
  }, [db, replica, userId]);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    let active = true;
    void openReplica(db, userId).then(async (opened) => {
      const [loaded, count] = await Promise.all([
        loadRows(db, userId),
        opened.store.pendingCount(),
      ]);
      if (active) {
        setReplica(opened);
        setData(loaded);
        setPending(count);
      }
    });
    return () => {
      active = false;
    };
  }, [db, ready, userId]);

  const sync = useCallback(async () => {
    if (!replica) {
      return;
    }
    setMessage('Sincronizando…');
    try {
      setMessage(describe(await replica.engine.sync()));
    } catch (error) {
      setMessage(`Falha ao sincronizar: ${error instanceof Error ? error.message : String(error)}`);
    }
    await refresh();
  }, [replica, refresh]);

  // Voltou a rede: envia a fila (F6).
  useEffect(() => {
    const onOnline = (): void => {
      void sync();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sync]);

  const write = async (action: (store: LocalSyncStore) => Promise<unknown>, done: string) => {
    if (!replica) {
      return;
    }
    try {
      await action(replica.store);
      setMessage(done);
    } catch (error) {
      setMessage(`Falhou: ${error instanceof Error ? error.message : String(error)}`);
    }
    await refresh();
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    const { profileId } = data;
    if (!profileId || newName.trim() === '') {
      return;
    }
    const name = newName.trim();
    setNewName('');
    void write(
      (store) =>
        store.write('categories', uuidv7(), {
          profileId,
          type: 'expense',
          name,
          parentId: null,
          icon: 'tag',
          color: '#2D6E85',
          archivedAt: null,
          sortOrder: 0,
          deletedAt: null,
        }),
      `Categoria "${name}" criada neste dispositivo.`,
    );
  };

  return (
    <div className={pages.page}>
      <h1 className={pages.title}>Sincronização (PoC)</h1>
      <Card title="Situação">
        <p>
          {userId
            ? `Usuário de teste ${userId}`
            : 'Defina VITE_ZL_DEV_USER_ID (pnpm dev:worktree já define).'}
        </p>
        <p>{online ? 'Conectado à rede.' : 'Sem rede: as alterações ficam na fila.'}</p>
        <p aria-live="polite">Alterações pendentes: {pending}</p>
        {message && <p role="status">{message}</p>}
        <div className={pages.actions}>
          <Button variant="primary" onClick={() => void sync()} disabled={!replica || !online}>
            Sincronizar
          </Button>
        </div>
      </Card>
      {replica && (
        <Card title="Categorias">
          {data.profileId ? (
            <form className={pages.actions} onSubmit={add}>
              <TextField
                label="Nova categoria"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button type="submit" disabled={newName.trim() === ''}>
                Adicionar
              </Button>
            </form>
          ) : (
            <p className={pages.emptyBody}>
              Sincronize para baixar o perfil antes de criar categorias.
            </p>
          )}
          <ul className={pages.syncList} aria-label="Categorias sincronizadas">
            {data.rows.map((row) => (
              <CategoryRow
                key={`${row.id}:${row.name}`}
                row={row}
                onRename={(name) =>
                  void write(
                    (store) => store.write('categories', row.id, { name: name.trim() }),
                    'Categoria renomeada.',
                  )
                }
                onDelete={() =>
                  void write(
                    (store) => store.write('categories', row.id, { deletedAt: nowIso() }, 'delete'),
                    'Categoria excluída.',
                  )
                }
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
