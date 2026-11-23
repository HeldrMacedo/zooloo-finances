// Dados sintéticos para os testes da tela de categorias: banco local real (SQLite do Node) e
// servidor falso que aceita ou recusa mutações.
import type {
  Change,
  Mutation,
  PullPage,
  PushResult,
  Rejection,
  SyncTransport,
} from '@zooloo/sync-core';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { LocalSyncStore } from '../data/sync/local-store.js';
import { openDatabase } from './node-sqlite.js';

export const USER = '01960000-0000-7000-8111-000000000000';
export const PROFILE = '01960000-0000-7000-8121-000000000000';
const SEED_HLC = '000000000000000-000000-0000000000000000';

export interface SeedCategory {
  readonly id: string;
  readonly name: string;
  readonly type?: 'income' | 'expense';
  readonly parent?: string;
  readonly system?: boolean;
  readonly archived?: boolean;
  readonly sortOrder?: number;
  readonly icon?: string;
  readonly color?: string;
}

export const id = (n: number): string => `01960000-0000-7000-8131-${String(n).padStart(12, '0')}`;

/** Árvore de exemplo: Alimentação com duas filhas, Moradia, Lazer e as "Outros". */
export const SAMPLE: readonly SeedCategory[] = [
  { id: id(1), name: 'Alimentação', icon: 'utensils', color: '#AD4621', sortOrder: 0 },
  { id: id(2), name: 'Mercado', parent: id(1), icon: 'shopping-cart', sortOrder: 0 },
  { id: id(3), name: 'Restaurantes', parent: id(1), icon: 'chef-hat', sortOrder: 1 },
  { id: id(4), name: 'Moradia', icon: 'house', color: '#16324A', sortOrder: 1 },
  { id: id(5), name: 'Lazer', icon: 'party-popper', color: '#8A5A00', sortOrder: 2 },
  { id: id(6), name: 'Outros', system: true, icon: 'circle-ellipsis', color: '#5B6B77' },
  { id: id(7), name: 'Salário', type: 'income', icon: 'briefcase', color: '#18744C' },
  {
    id: id(8),
    name: 'Outros',
    type: 'income',
    system: true,
    icon: 'circle-ellipsis',
    color: '#5B6B77',
  },
];

const clocks = (fields: object) =>
  Object.fromEntries(Object.keys(fields).map((name) => [name, SEED_HLC]));

function change(entity: string, recordId: string, fields: Change['fields']): Change {
  return { entity, id: recordId, version: 1, fields, clocks: clocks(fields) };
}

/** Banco local já sincronizado com o perfil e as categorias dadas. */
export async function seededDatabase(
  categories: readonly SeedCategory[] = SAMPLE,
  options: { readonly withProfile?: boolean } = {},
): Promise<SqliteRemoteDatabase> {
  const db = await openDatabase();
  const store = await LocalSyncStore.open(db, USER, () => 1_000);
  const profile =
    options.withProfile === false
      ? []
      : [
          change('profiles', PROFILE, {
            name: 'Pessoal',
            currency: 'BRL',
            color: '#2D6E85',
            icon: 'wallet',
            archivedAt: null,
            sortOrder: 0,
            deletedAt: null,
          }),
        ];
  const rows = categories.map((c) =>
    change('categories', c.id, {
      profileId: PROFILE,
      type: c.type ?? 'expense',
      name: c.name,
      parentId: c.parent ?? null,
      icon: c.icon ?? 'tag',
      color: c.color ?? '#2D6E85',
      isSystem: c.system ?? false,
      archivedAt: c.archived ? '2026-11-20T12:00:00.000Z' : null,
      sortOrder: c.sortOrder ?? 0,
      deletedAt: null,
    }),
  );
  await store.apply(
    [...profile, ...rows].map((row) => ({
      entity: row.entity,
      id: row.id,
      version: row.version,
      record: { fields: row.fields, clocks: row.clocks },
    })),
    1,
  );
  return db;
}

/** Servidor falso: guarda o que recebe; `reject` decide a recusa de cada mutação. */
export class FakeTransport implements SyncTransport {
  readonly pushed: Mutation[] = [];
  failing = false;
  reject: (mutation: Mutation) => Rejection['reason'] | null = () => null;
  private version = 1;

  push(mutations: readonly Mutation[]): Promise<PushResult> {
    if (this.failing) {
      return Promise.reject(new Error('Servidor fora do ar.'));
    }
    this.version += 1;
    const rejected: Rejection[] = [];
    mutations.forEach((mutation, index) => {
      const reason = this.reject(mutation);
      if (reason) {
        rejected.push({ index, reason, current: null });
      } else {
        this.pushed.push(mutation);
      }
    });
    return Promise.resolve({ version: this.version, rejected });
  }

  pull(since: number): Promise<PullPage> {
    if (this.failing) {
      return Promise.reject(new Error('Servidor fora do ar.'));
    }
    return Promise.resolve({ changes: [], version: Math.max(since, this.version), hasMore: false });
  }
}
