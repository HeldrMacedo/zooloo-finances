import { categories, profiles } from '@zooloo/db-schema/local';
import { count, eq } from 'drizzle-orm';
import { useCallback, useEffect, useState } from 'react';
import { nowIso } from '../../data/clock.js';
import { uuidv7 } from '../../data/ids.js';
import type { LocalDbStatus } from '../../data/local-db/coordinator.js';
import { type LocalDb, useLocalDb, useLocalDbStatus } from '../../data/local-db/LocalDbContext.js';
import { Button } from '../../ui/button/Button.js';
import { Card } from '../../ui/card/Card.js';
import pages from './pages.module.css';

/**
 * PoC 1 (doc 09 §8): banco local no PWA. Só em desenvolvimento e no build de E2E. Dados
 * sintéticos; perfil fixo para não depender de login.
 */
const POC_USER = '01960000-0000-7000-8fff-000000000001';
const POC_PROFILE = '01960000-0000-7000-8fff-000000000002';

function describeRole(status: LocalDbStatus): string {
  switch (status.role) {
    case 'leader':
      return 'Esta aba é a líder e abre o banco local.';
    case 'follower':
      return 'Esta aba é seguidora e usa o banco pela aba líder.';
    default:
      return `Banco local indisponível: ${status.error}`;
  }
}

async function countCategories(db: LocalDb): Promise<number> {
  const [row] = await db.orm
    .select({ total: count() })
    .from(categories)
    .where(eq(categories.profileId, POC_PROFILE));
  return row?.total ?? 0;
}

async function addCategory(db: LocalDb, index: number): Promise<void> {
  const now = nowIso();
  const base = { userId: POC_USER, createdAt: now, updatedAt: now, hlc: `${now}:poc` };
  await db.orm
    .insert(profiles)
    .values({
      ...base,
      id: POC_PROFILE,
      name: 'Perfil sintético',
      currency: 'BRL',
      color: '#16B89A',
      icon: 'wallet',
    })
    .onConflictDoNothing();
  await db.orm.insert(categories).values({
    ...base,
    id: uuidv7(),
    profileId: POC_PROFILE,
    type: 'expense',
    name: `Categoria de teste ${index}`,
    icon: 'tag',
    color: '#142B3B',
  });
}

export function LocalDbPocPage() {
  const db = useLocalDb();
  const status = useLocalDbStatus();
  const [total, setTotal] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (db) {
      setTotal(await countCategories(db));
    }
  }, [db]);

  useEffect(() => {
    if (!db || status.role === 'unavailable') {
      return undefined;
    }
    let active = true;
    void countCategories(db).then((value) => {
      if (active) {
        setTotal(value);
      }
    });
    return () => {
      active = false;
    };
  }, [db, status.role]);

  const run =
    (action: () => Promise<void>, done: string, recount = true) =>
    async () => {
      try {
        await action();
        setMessage(done);
        if (recount) {
          await refresh();
        }
      } catch (error) {
        setMessage(`Falhou: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

  return (
    <div className={pages.page}>
      <h1 className={pages.title}>Banco local (PoC)</h1>
      <Card title="Situação">
        <p>{describeRole(status)}</p>
        {status.role === 'leader' && (
          <p className={pages.emptyBody}>
            VFS {status.storage.vfs}, arquivo {status.storage.file}
          </p>
        )}
        <p aria-live="polite">Categorias de teste: {total ?? '…'}</p>
        {message && <p role="status">{message}</p>}
      </Card>
      {db && (
        <Card title="Ações">
          <div className={pages.actions}>
            <Button
              variant="primary"
              onClick={run(() => addCategory(db, (total ?? 0) + 1), 'Categoria adicionada.')}
            >
              Adicionar categoria de teste
            </Button>
            <Button onClick={run(refresh, 'Contagem atualizada.')}>Atualizar contagem</Button>
            {status.role === 'leader' && (
              <Button
                variant="danger"
                onClick={run(
                  () => db.coordinator.wipe(),
                  'Banco local apagado. Recarregue a página para recriá-lo.',
                  false,
                )}
              >
                Apagar banco local
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
