import { categories, profiles } from '@zooloo/db-schema/local';
import {
  type CategoryEntry,
  type CategoryNode,
  type CategoryType,
  type CategoryViolation,
  categoryViolations,
  deletionCascade,
  nextSortOrder,
  reorderSiblings,
  violationField,
} from '@zooloo/domain';
import type { MessageKey, Messages } from '@zooloo/i18n';
import type { Fields, MutationOp } from '@zooloo/sync-core';
import { CategoryCreateSchema, CategoryUpdateSchema } from '@zooloo/validation';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { nowIso } from '../clock.js';
import { uuidv7 } from '../ids.js';
import type { SyncedEntity } from '../sync/local-store.js';

/** Categoria do banco local com o que a tela mostra além das regras. */
export interface LocalCategory extends CategoryEntry {
  readonly icon: string;
  readonly color: string;
  readonly archivedAt: string | null;
}

export interface CategoriesSnapshot {
  /** Perfil em uso: o primeiro não excluído (o seletor de perfil chega depois). */
  readonly profileId: string | null;
  /** Todas as categorias do perfil, inclusive excluídas (as regras olham as mães excluídas). */
  readonly categories: readonly LocalCategory[];
}

/** Escrita pelo sync: banco local mais outbox (`SyncApi.write`). */
export type CategoryWriter = (
  entity: SyncedEntity,
  id: string,
  fields: Fields,
  op?: MutationOp,
) => Promise<void>;

export async function loadCategories(
  orm: SqliteRemoteDatabase,
  userId: string,
): Promise<CategoriesSnapshot> {
  const [profile] = await orm
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.userId, userId), isNull(profiles.deletedAt)))
    .orderBy(asc(profiles.createdAt), asc(profiles.id))
    .limit(1);
  if (!profile) {
    return { profileId: null, categories: [] };
  }
  const rows = await orm
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.profileId, profile.id)));
  return {
    profileId: profile.id,
    categories: rows.map((row) => ({
      id: row.id,
      profileId: row.profileId,
      type: row.type,
      name: row.name,
      parentId: row.parentId,
      isSystem: row.isSystem,
      archived: row.archivedAt !== null,
      deleted: row.deletedAt !== null,
      sortOrder: row.sortOrder,
      icon: row.icon,
      color: row.color,
      archivedAt: row.archivedAt,
    })),
  };
}

export interface CategoryDraft {
  readonly name: string;
  readonly parentId: string | null;
  readonly icon: string;
  readonly color: string;
}

export type DraftField = 'name' | 'parentId' | 'icon' | 'color' | 'form';
/** Erros por campo, como chaves do catálogo de mensagens. */
export type DraftErrors = Partial<Record<DraftField, AppMessage>>;
export type AppMessage = MessageKey<Messages>;

export type SaveResult =
  | { readonly ok: true; readonly id: string; readonly name: string }
  | { readonly ok: false; readonly errors: DraftErrors };

export const violationMessage = (violation: CategoryViolation): AppMessage =>
  `category.errors.${violation}`;

/** Erros de regra do domínio, ligados ao campo quando houver campo (RNF-UX-01). */
export function violationErrors(violations: readonly CategoryViolation[]): DraftErrors {
  const errors: DraftErrors = {};
  for (const violation of violations) {
    const field = violationField(violation) ?? 'form';
    errors[field] ??= violationMessage(violation);
  }
  return errors;
}

/** Erros de formato (Zod) do nome; ícone e cor vêm de listas fixas da tela. */
interface SchemaIssue {
  readonly code: string;
  readonly path: readonly PropertyKey[];
}

function schemaErrors(error: { readonly issues: readonly SchemaIssue[] }): DraftErrors {
  const errors: DraftErrors = {};
  for (const issue of error.issues) {
    if (issue.path[0] === 'name') {
      errors.name ??=
        issue.code === 'too_small'
          ? 'category.errors.nameRequired'
          : issue.code === 'too_big'
            ? 'category.errors.nameTooLong'
            : 'category.errors.nameInvalid';
    } else if (issue.path[0] === 'parentId') {
      errors.parentId ??= 'category.errors.parentSelf';
    } else {
      errors.form ??= 'category.errors.unexpected';
    }
  }
  return errors;
}

const hasErrors = (errors: DraftErrors): boolean => Object.keys(errors).length > 0;

function find(snapshot: CategoriesSnapshot, id: string): LocalCategory | undefined {
  return snapshot.categories.find((c) => c.id === id && !c.deleted);
}

function check(
  snapshot: CategoriesSnapshot,
  before: CategoryNode | null,
  after: CategoryNode,
): DraftErrors {
  return violationErrors(categoryViolations(before, after, snapshot.categories));
}

/** Cria uma categoria do perfil em uso, validando entrada (Zod) e regras (domínio) antes de gravar. */
export async function createCategory(
  write: CategoryWriter,
  snapshot: CategoriesSnapshot,
  type: CategoryType,
  draft: CategoryDraft,
  newId: () => string = () => uuidv7(),
): Promise<SaveResult> {
  const { profileId } = snapshot;
  if (profileId === null) {
    return { ok: false, errors: { form: 'category.errors.unexpected' } };
  }
  const id = newId();
  const parsed = CategoryCreateSchema.safeParse({ id, type, ...draft });
  if (!parsed.success) {
    return { ok: false, errors: schemaErrors(parsed.error) };
  }
  const input = parsed.data;
  const node: CategoryNode = {
    id,
    profileId,
    type,
    name: input.name,
    parentId: input.parentId,
    isSystem: false,
    archived: false,
    deleted: false,
  };
  const errors = check(snapshot, null, node);
  if (hasErrors(errors)) {
    return { ok: false, errors };
  }
  await write('categories', id, {
    profileId,
    type,
    name: input.name,
    parentId: input.parentId,
    icon: input.icon,
    color: input.color,
    archivedAt: null,
    sortOrder: nextSortOrder(snapshot.categories, { profileId, type, parentId: input.parentId }),
    deletedAt: null,
  });
  return { ok: true, id, name: input.name };
}

/**
 * Altera nome, mãe, ícone e cor. Só os campos que mudaram vão para o outbox (merge por campo,
 * ADR-0007). Ao trocar de mãe, a categoria vai para o fim das novas irmãs.
 */
export async function updateCategory(
  write: CategoryWriter,
  snapshot: CategoriesSnapshot,
  id: string,
  draft: CategoryDraft,
): Promise<SaveResult> {
  const before = find(snapshot, id);
  if (!before) {
    return { ok: false, errors: { form: 'category.errors.parentMissing' } };
  }
  const patch: Record<string, unknown> = {};
  if (draft.name !== before.name) {
    patch['name'] = draft.name;
  }
  if (draft.parentId !== before.parentId) {
    patch['parentId'] = draft.parentId;
  }
  if (draft.icon !== before.icon) {
    patch['icon'] = draft.icon;
  }
  if (draft.color.toUpperCase() !== before.color.toUpperCase()) {
    patch['color'] = draft.color;
  }
  if (Object.keys(patch).length === 0) {
    return { ok: true, id, name: before.name };
  }
  const parsed = CategoryUpdateSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, errors: schemaErrors(parsed.error) };
  }
  const fields: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      fields[key] = value;
    }
  }
  const name = parsed.data.name ?? before.name;
  if (parsed.data.name === before.name) {
    // O nome só mudou em espaços: não há o que gravar nesse campo.
    delete fields['name'];
  }
  const parentId = parsed.data.parentId === undefined ? before.parentId : parsed.data.parentId;
  const errors = check(snapshot, before, { ...before, name, parentId });
  if (hasErrors(errors)) {
    return { ok: false, errors };
  }
  if (parentId !== before.parentId) {
    fields['sortOrder'] = nextSortOrder(snapshot.categories, {
      profileId: before.profileId,
      type: before.type,
      parentId,
    });
  }
  if (Object.keys(fields).length > 0) {
    await write('categories', id, fields);
  }
  return { ok: true, id, name };
}

/** Arquiva ou desarquiva; as filhas não são gravadas (estado derivado, RN-CAT-02). */
export async function setCategoryArchived(
  write: CategoryWriter,
  snapshot: CategoriesSnapshot,
  id: string,
  archived: boolean,
): Promise<DraftErrors> {
  const before = find(snapshot, id);
  if (!before) {
    return { form: 'category.errors.parentMissing' };
  }
  const errors = check(snapshot, before, { ...before, archived });
  if (hasErrors(errors)) {
    return errors;
  }
  await write('categories', id, { archivedAt: archived ? nowIso() : null });
  return {};
}

/** Filhas vivas que a exclusão leva junto, para a confirmação. */
export function deletionChildren(snapshot: CategoriesSnapshot, id: string): LocalCategory[] {
  const ids = new Set(deletionCascade(snapshot.categories, id));
  return snapshot.categories.filter((c) => ids.has(c.id));
}

/**
 * Exclusão lógica com as filhas (RN-CAT-02). O servidor repete a cascata na mesma transação e
 * alcança filhas que este aparelho não conhece.
 */
export async function deleteCategory(
  write: CategoryWriter,
  snapshot: CategoriesSnapshot,
  id: string,
): Promise<DraftErrors> {
  const before = find(snapshot, id);
  if (!before) {
    return { form: 'category.errors.parentMissing' };
  }
  const errors = check(snapshot, before, { ...before, deleted: true });
  if (hasErrors(errors)) {
    return errors;
  }
  const deletedAt = nowIso();
  for (const child of deletionChildren(snapshot, id)) {
    await write('categories', child.id, { deletedAt }, 'delete');
  }
  await write('categories', id, { deletedAt }, 'delete');
  return {};
}

/** Irmãs vivas na mesma lista (perfil, tipo e mãe), sem "Outros", que não é reordenável. */
export function siblingsOf(snapshot: CategoriesSnapshot, category: CategoryEntry): LocalCategory[] {
  return snapshot.categories.filter(
    (c) =>
      !c.deleted &&
      !c.isSystem &&
      c.profileId === category.profileId &&
      c.type === category.type &&
      c.parentId === category.parentId,
  );
}

/** Ordem manual (RF-CAT-05): grava só as irmãs cuja posição mudou. Devolve se algo mudou. */
export async function moveCategory(
  write: CategoryWriter,
  snapshot: CategoriesSnapshot,
  id: string,
  targetId: string,
  position: 'before' | 'after',
): Promise<boolean> {
  const moved = find(snapshot, id);
  if (!moved || moved.isSystem) {
    return false;
  }
  const changes = reorderSiblings(siblingsOf(snapshot, moved), id, targetId, position);
  for (const change of changes) {
    await write('categories', change.id, { sortOrder: change.sortOrder });
  }
  return changes.length > 0;
}
