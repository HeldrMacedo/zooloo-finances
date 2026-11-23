import { type CategoryType, categoryTree } from '@zooloo/domain';
import { t } from '@zooloo/i18n';
import { Plus, Tags } from 'lucide-react';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { useCallback, useEffect, useState } from 'react';
import {
  type AppMessage,
  type CategoriesSnapshot,
  type CategoryDraft,
  createCategory,
  deleteCategory,
  deletionChildren,
  type DraftErrors,
  type LocalCategory,
  loadCategories,
  moveCategory,
  setCategoryArchived,
  updateCategory,
} from '../../../data/categories/categories.js';
import { useSync } from '../../../data/sync/SyncContext.js';
import { Button } from '../../../ui/button/Button.js';
import { Card } from '../../../ui/card/Card.js';
import { Dialog } from '../../../ui/dialog/Dialog.js';
import { SwitchField } from '../../../ui/field/SwitchField.js';
import { Tabs } from '../../../ui/tabs/Tabs.js';
import pages from '../pages.module.css';
import { CategoryForm, type FormTarget } from './CategoryForm.js';
import styles from './CategoriesPage.module.css';
import { CategoryTree, type Placement } from './CategoryTree.js';

const TYPES: readonly { key: CategoryType; label: string }[] = [
  { key: 'expense', label: t('category.expense') },
  { key: 'income', label: t('category.income') },
];

/** Lê o banco local de novo a cada escrita ou sync (`revision`). */
function useCategories(): CategoriesSnapshot | null {
  const { orm, userId, state } = useSync();
  const [loaded, setLoaded] = useState<{
    readonly orm: SqliteRemoteDatabase;
    readonly snapshot: CategoriesSnapshot;
  } | null>(null);
  useEffect(() => {
    if (!orm) {
      return undefined;
    }
    let active = true;
    void loadCategories(orm, userId).then((snapshot) => {
      if (active) {
        setLoaded({ orm, snapshot });
      }
    });
    return () => {
      active = false;
    };
  }, [orm, userId, state.revision]);
  // Leitura de outro banco (troca de usuário ou de aba líder) não vale para o atual.
  return loaded && loaded.orm === orm ? loaded.snapshot : null;
}

function EmptyState({ title, body }: { readonly title: string; readonly body?: string }) {
  return (
    <div className={pages.empty}>
      <Tags aria-hidden="true" size={28} className={pages.emptyIcon} />
      <p className={pages.emptyTitle}>{title}</p>
      {body && <p className={pages.emptyBody}>{body}</p>}
    </div>
  );
}

/**
 * Categorias de receita e de despesa do perfil (RF-CAT-01, 02 e 05). Lê e grava no banco local; o
 * sync leva ao servidor, que repete as regras e decide (ADR-0007).
 */
export function CategoriesPage() {
  const sync = useSync();
  const snapshot = useCategories();
  const [type, setType] = useState<CategoryType>('expense');
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState<FormTarget | null>(null);
  const [toDelete, setToDelete] = useState<LocalCategory | null>(null);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState<AppMessage | null>(null);

  const report = useCallback((errors: DraftErrors, done: string): void => {
    const first = Object.values(errors)[0];
    setFailure(first ?? null);
    setNotice(first ? '' : done);
  }, []);

  if (sync.state.phase === 'unavailable') {
    return (
      <div className={pages.page}>
        <h1 className={pages.title}>{t('category.title')}</h1>
        <EmptyState title={t('sync.unavailable')} body={t('category.unavailable')} />
      </div>
    );
  }

  if (snapshot === null) {
    return (
      <div className={pages.page} aria-busy="true">
        <h1 className={pages.title}>{t('category.title')}</h1>
        <p role="status" className={styles.loading}>
          {t('category.loading')}
        </p>
      </div>
    );
  }

  const { profileId } = snapshot;
  const tree = profileId
    ? categoryTree(snapshot.categories, { profileId, type, includeArchived: showArchived })
    : [];
  const typeLabel = TYPES.find((item) => item.key === type)?.label ?? '';

  const submit = async (draft: CategoryDraft): Promise<DraftErrors> => {
    if (!form) {
      return {};
    }
    const result =
      form.kind === 'create'
        ? await createCategory(sync.write, snapshot, form.type, draft)
        : await updateCategory(sync.write, snapshot, form.category.id, draft);
    if (!result.ok) {
      return result.errors;
    }
    setForm(null);
    report(
      {},
      form.kind === 'create'
        ? t('category.created', { name: result.name })
        : t('category.saved', { name: result.name }),
    );
    return {};
  };

  const archive = async (category: LocalCategory, archived: boolean): Promise<void> => {
    const errors = await setCategoryArchived(sync.write, snapshot, category.id, archived);
    report(
      errors,
      t(archived ? 'category.archived' : 'category.unarchived', { name: category.name }),
    );
  };

  const move = async (
    category: LocalCategory,
    target: LocalCategory,
    placement: Placement,
  ): Promise<void> => {
    if (await moveCategory(sync.write, snapshot, category.id, target.id, placement)) {
      report({}, t('category.moved', { name: category.name }));
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!toDelete) {
      return;
    }
    const errors = await deleteCategory(sync.write, snapshot, toDelete.id);
    setToDelete(null);
    report(errors, t('category.deleted', { name: toDelete.name }));
  };

  const doomed = toDelete ? deletionChildren(snapshot, toDelete.id) : [];

  return (
    <div className={pages.page}>
      <header className={styles.header}>
        <h1 className={pages.title}>{t('category.title')}</h1>
        <Button
          variant="primary"
          icon={Plus}
          disabled={!profileId}
          onClick={() => setForm({ kind: 'create', type, parentId: null })}
        >
          {t('category.newCategory')}
        </Button>
      </header>

      <p role="status" className={styles.notice}>
        {notice}
      </p>
      {failure && (
        <p role="alert" className={styles.formError}>
          {t(failure)}
        </p>
      )}

      {!profileId ? (
        <EmptyState title={t('category.noProfile')} />
      ) : (
        <Card>
          <Tabs label={t('category.tabs')} tabs={TYPES} selected={type} onSelect={setType}>
            <SwitchField
              label={t('category.showArchived')}
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            {tree.length === 0 ? (
              <EmptyState title={t('category.emptyTitle')} body={t('category.emptyBody')} />
            ) : (
              <CategoryTree
                label={t('category.listLabel', { type: typeLabel })}
                tree={tree}
                onEdit={(category) => setForm({ kind: 'edit', category })}
                onAddChild={(parent) =>
                  setForm({ kind: 'create', type: parent.type, parentId: parent.id })
                }
                onArchive={(category, archived) => void archive(category, archived)}
                onDelete={setToDelete}
                onMove={(category, target, placement) => void move(category, target, placement)}
              />
            )}
          </Tabs>
        </Card>
      )}

      {form && (
        <CategoryForm
          key={form.kind === 'edit' ? form.category.id : `new-${form.parentId ?? ''}`}
          target={form}
          snapshot={snapshot}
          onSubmit={submit}
          onClose={() => setForm(null)}
        />
      )}

      {toDelete && (
        <Dialog
          open
          title={t('category.deleteTitle', { name: toDelete.name })}
          description={t('category.deleteBody')}
          onClose={() => setToDelete(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setToDelete(null)}>
                {t('actions.cancel')}
              </Button>
              <Button variant="danger" onClick={() => void confirmDelete()}>
                {t('category.confirmDelete')}
              </Button>
            </>
          }
        >
          <p>
            {t('category.deleteChildren', {
              count: doomed.length,
              names: doomed.map((c) => c.name).join(', '),
            })}
          </p>
        </Dialog>
      )}
    </div>
  );
}
