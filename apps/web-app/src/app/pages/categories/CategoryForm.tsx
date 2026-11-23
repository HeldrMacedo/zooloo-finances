import { type CategoryType, parentCandidates } from '@zooloo/domain';
import { t } from '@zooloo/i18n';
import { categoryColor } from '@zooloo/ui-tokens';
import { type FormEvent, useState } from 'react';
import type {
  CategoriesSnapshot,
  CategoryDraft,
  DraftErrors,
  LocalCategory,
} from '../../../data/categories/categories.js';
import { Button } from '../../../ui/button/Button.js';
import { ColorPicker, IconPicker } from '../../../ui/category/ChoiceGrid.js';
import { Dialog } from '../../../ui/dialog/Dialog.js';
import { SelectField } from '../../../ui/field/SelectField.js';
import { TextField } from '../../../ui/field/TextField.js';
import styles from './CategoriesPage.module.css';

export type FormTarget =
  | { readonly kind: 'create'; readonly type: CategoryType; readonly parentId: string | null }
  | { readonly kind: 'edit'; readonly category: LocalCategory };

const NO_PARENT = '';

function initialDraft(target: FormTarget): CategoryDraft {
  if (target.kind === 'edit') {
    const { name, parentId, icon, color } = target.category;
    return { name, parentId, icon, color };
  }
  return { name: '', parentId: target.parentId, icon: 'tag', color: categoryColor.teal.light };
}

export interface CategoryFormProps {
  readonly target: FormTarget;
  readonly snapshot: CategoriesSnapshot;
  readonly onSubmit: (draft: CategoryDraft) => Promise<DraftErrors>;
  readonly onClose: () => void;
}

/** Criar e editar categoria (RF-CAT-01): nome, mãe, ícone e cor, com erros ligados ao campo. */
export function CategoryForm({ target, snapshot, onSubmit, onClose }: CategoryFormProps) {
  const [draft, setDraft] = useState<CategoryDraft>(() => initialDraft(target));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [busy, setBusy] = useState(false);
  const editing = target.kind === 'edit' ? target.category : null;
  const type = editing?.type ?? (target.kind === 'create' ? target.type : 'expense');
  const system = editing?.isSystem ?? false;

  const candidates = snapshot.profileId
    ? parentCandidates(snapshot.categories, {
        profileId: snapshot.profileId,
        type,
        selfId: editing?.id ?? null,
      })
    : [];
  const hasChildren =
    editing !== null && snapshot.categories.some((c) => c.parentId === editing.id && !c.deleted);
  // A mãe atual continua na lista mesmo arquivada, para o campo mostrar o valor certo.
  const current = snapshot.categories.find((c) => c.id === draft.parentId);
  const parents =
    current && !candidates.some((c) => c.id === current.id) ? [...candidates, current] : candidates;
  const parentOptions = [
    { value: NO_PARENT, label: t('category.parentNone') },
    ...parents.map((c) => ({ value: c.id, label: c.name })),
  ];

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    const result = await onSubmit(draft);
    setBusy(false);
    setErrors(result);
  };

  const error = (field: keyof DraftErrors): string | undefined => {
    const key = errors[field];
    return key ? t(key) : undefined;
  };

  const title =
    target.kind === 'edit'
      ? t('category.editCategory')
      : target.parentId
        ? t('category.newSubcategory')
        : t('category.newCategory');

  return (
    <Dialog
      open
      title={title}
      onClose={onClose}
      description={system ? t('category.systemHint') : undefined}
    >
      <form className={styles.form} onSubmit={(event) => void submit(event)} noValidate>
        <TextField
          label={t('category.name')}
          value={draft.name}
          maxLength={80}
          autoComplete="off"
          disabled={system}
          data-autofocus={!system || undefined}
          error={error('name')}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        <SelectField
          label={t('category.parent')}
          options={parentOptions}
          value={draft.parentId ?? NO_PARENT}
          disabled={system || hasChildren}
          hint={hasChildren ? t('category.parentLocked') : t('category.parentHint')}
          error={error('parentId')}
          onChange={(event) =>
            setDraft({
              ...draft,
              parentId: event.target.value === NO_PARENT ? null : event.target.value,
            })
          }
        />
        <IconPicker
          legend={t('category.icon')}
          value={draft.icon}
          onChange={(icon) => setDraft({ ...draft, icon })}
        />
        <ColorPicker
          legend={t('category.color')}
          value={draft.color}
          onChange={(color) => setDraft({ ...draft, color })}
        />
        {(errors.form ?? errors.icon ?? errors.color) && (
          <p className={styles.formError} role="alert">
            {error('form') ?? error('icon') ?? error('color')}
          </p>
        )}
        <div className={styles.formActions}>
          <Button variant="ghost" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button variant="primary" type="submit" busy={busy}>
            {t('actions.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
