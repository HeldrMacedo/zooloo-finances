/** Árvore, arquivamento derivado, cascata e ordem manual de categorias (RN-CAT-02, RF-CAT-05). */
import type { CategoryNode, CategoryType } from './category.js';

export interface CategoryEntry extends CategoryNode {
  readonly sortOrder: number;
}

export interface CategoryTreeNode<T extends CategoryEntry> {
  readonly category: T;
  /** Arquivada por si ou pela mãe. */
  readonly archived: boolean;
  readonly children: readonly T[];
}

export interface CategoryActions {
  readonly rename: boolean;
  readonly changeParent: boolean;
  readonly archive: boolean;
  readonly remove: boolean;
  readonly reorder: boolean;
}

export interface SortChange {
  readonly id: string;
  readonly sortOrder: number;
}

/** Filha de mãe arquivada conta como arquivada (estado derivado, sem gravar na filha). */
export function isEffectivelyArchived(
  category: CategoryNode,
  categories: readonly CategoryNode[],
): boolean {
  if (category.archived) {
    return true;
  }
  if (category.parentId === null) {
    return false;
  }
  return categories.some((c) => c.id === category.parentId && c.archived);
}

/** Ids das filhas vivas que são excluídas junto com a mãe. */
export function deletionCascade(categories: readonly CategoryNode[], id: string): string[] {
  return categories.filter((c) => c.parentId === id && !c.deleted).map((c) => c.id);
}

/** Ações permitidas na interface; "Outros" só muda ícone e cor (RN-CAT-03). */
export function categoryActions(category: CategoryNode): CategoryActions {
  const allowed = !category.isSystem;
  return {
    rename: allowed,
    changeParent: allowed,
    archive: allowed,
    remove: allowed,
    reorder: allowed,
  };
}

/** Ordem de exibição: "Outros" no fim, depois a ordem manual, o nome e o id. */
export function compareCategories(a: CategoryEntry, b: CategoryEntry): number {
  if (a.isSystem !== b.isSystem) {
    return a.isSystem ? 1 : -1;
  }
  return (
    a.sortOrder - b.sortOrder ||
    a.name.localeCompare(b.name, 'pt-BR') ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

interface Scope {
  readonly profileId: string;
  readonly type: CategoryType;
}

function inScope<T extends CategoryEntry>(categories: readonly T[], scope: Scope): T[] {
  return categories.filter(
    (c) => !c.deleted && c.profileId === scope.profileId && c.type === scope.type,
  );
}

/** Mães possíveis: primeiro nível, mesmo tipo, vivas, não arquivadas, não "Outros" e não a própria. */
export function parentCandidates<T extends CategoryEntry>(
  categories: readonly T[],
  scope: Scope & { readonly selfId: string | null },
): T[] {
  const live = inScope(categories, scope);
  if (scope.selfId !== null && live.some((c) => c.parentId === scope.selfId)) {
    return [];
  }
  return live
    .filter((c) => c.parentId === null && !c.archived && !c.isSystem && c.id !== scope.selfId)
    .sort(compareCategories);
}

/** Mães e filhas de um perfil e tipo; filhas órfãs ficam de fora. */
export function categoryTree<T extends CategoryEntry>(
  categories: readonly T[],
  scope: Scope & { readonly includeArchived: boolean },
): CategoryTreeNode<T>[] {
  const live = inScope(categories, scope).sort(compareCategories);
  const visible = (c: T) => scope.includeArchived || !isEffectivelyArchived(c, live);
  return live
    .filter((c) => c.parentId === null && visible(c))
    .map((category) => ({
      category,
      archived: category.archived,
      children: live.filter((c) => c.parentId === category.id && visible(c)),
    }));
}

/**
 * Move `id` para antes ou depois de `targetId` entre as irmãs e renumera de 0 a n-1.
 * Devolve só as irmãs cuja ordem mudou.
 */
export function reorderSiblings(
  siblings: readonly CategoryEntry[],
  id: string,
  targetId: string,
  position: 'before' | 'after',
): SortChange[] {
  const ordered = [...siblings].sort(compareCategories);
  const moved = ordered.find((c) => c.id === id);
  if (moved === undefined || id === targetId) {
    return [];
  }
  const rest = ordered.filter((c) => c.id !== id);
  const targetIndex = rest.findIndex((c) => c.id === targetId);
  if (targetIndex < 0) {
    return [];
  }
  rest.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, moved);
  return rest
    .map((c, sortOrder) => ({ id: c.id, sortOrder, before: c.sortOrder }))
    .filter((c) => c.sortOrder !== c.before)
    .map(({ id: changed, sortOrder }) => ({ id: changed, sortOrder }));
}

/** Ordem para uma nova categoria: depois da última irmã viva. */
export function nextSortOrder(
  categories: readonly CategoryEntry[],
  scope: Scope & { readonly parentId: string | null },
): number {
  const orders = inScope(categories, scope)
    .filter((c) => c.parentId === scope.parentId)
    .map((c) => c.sortOrder);
  return orders.length === 0 ? 0 : Math.max(...orders) + 1;
}
