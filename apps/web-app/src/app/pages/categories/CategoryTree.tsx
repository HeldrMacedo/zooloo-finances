import { type CategoryTreeNode, categoryActions } from '@zooloo/domain';
import { t } from '@zooloo/i18n';
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { LocalCategory } from '../../../data/categories/categories.js';
import { CategoryChip } from '../../../ui/category/CategoryChip.js';
import { type ActionMenuItem, ActionMenu } from '../../../ui/menu/ActionMenu.js';
import styles from './CategoriesPage.module.css';

export type Placement = 'before' | 'after';

export interface CategoryTreeActions {
  readonly onEdit: (category: LocalCategory) => void;
  readonly onAddChild: (parent: LocalCategory) => void;
  readonly onArchive: (category: LocalCategory, archived: boolean) => void;
  readonly onDelete: (category: LocalCategory) => void;
  readonly onMove: (category: LocalCategory, target: LocalCategory, placement: Placement) => void;
}

interface RowProps extends CategoryTreeActions {
  readonly category: LocalCategory;
  /** Arquivada por si ou pela mãe (estado derivado, RN-CAT-02). */
  readonly archived: boolean;
  readonly previous: LocalCategory | undefined;
  readonly next: LocalCategory | undefined;
  readonly childCount: number;
  readonly dragging: LocalCategory | null;
  readonly onDragChange: (category: LocalCategory | null) => void;
}

function sameGroup(a: LocalCategory, b: LocalCategory): boolean {
  return a.parentId === b.parentId && a.type === b.type && a.id !== b.id;
}

function CategoryRow({
  category,
  archived,
  previous,
  next,
  childCount,
  dragging,
  onDragChange,
  onEdit,
  onAddChild,
  onArchive,
  onDelete,
  onMove,
}: RowProps) {
  const [dropAt, setDropAt] = useState<Placement | null>(null);
  const allowed = categoryActions(category);
  const topLevel = category.parentId === null;

  const moveUp = previous && (() => onMove(category, previous, 'before'));
  const moveDown = next && (() => onMove(category, next, 'after'));
  const items: ActionMenuItem[] = [
    { id: 'edit', label: t('category.edit'), icon: Pencil, onSelect: () => onEdit(category) },
    ...(topLevel && allowed.changeParent && !category.archived
      ? [
          {
            id: 'child',
            label: t('category.newSubcategory'),
            icon: Plus,
            onSelect: () => onAddChild(category),
          },
        ]
      : []),
    ...(allowed.reorder && moveUp
      ? [{ id: 'up', label: t('category.moveUp'), icon: ArrowUp, onSelect: moveUp }]
      : []),
    ...(allowed.reorder && moveDown
      ? [{ id: 'down', label: t('category.moveDown'), icon: ArrowDown, onSelect: moveDown }]
      : []),
    ...(allowed.archive
      ? [
          category.archived
            ? {
                id: 'unarchive',
                label: t('category.unarchive'),
                icon: ArchiveRestore,
                onSelect: () => onArchive(category, false),
              }
            : {
                id: 'archive',
                label: t('category.archive'),
                icon: Archive,
                onSelect: () => onArchive(category, true),
              },
        ]
      : []),
    ...(allowed.remove
      ? [
          {
            id: 'delete',
            label: t('category.delete'),
            icon: Trash2,
            tone: 'danger' as const,
            onSelect: () => onDelete(category),
          },
        ]
      : []),
  ];

  const onHandleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowUp' && moveUp) {
      event.preventDefault();
      moveUp();
    } else if (event.key === 'ArrowDown' && moveDown) {
      event.preventDefault();
      moveDown();
    }
  };

  const accepts = dragging !== null && sameGroup(dragging, category) && allowed.reorder;
  const rowRef = useRef<HTMLDivElement>(null);

  // Alvo de soltura por eventos nativos: a linha não é interativa; o teclado usa a alça e o menu.
  useEffect(() => {
    const row = rowRef.current;
    if (!row || !accepts) {
      return undefined;
    }
    const placement = (event: DragEvent): Placement => {
      const box = row.getBoundingClientRect();
      return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
    };
    const onDragOver = (event: DragEvent): void => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      setDropAt(placement(event));
    };
    const onDragLeave = (): void => setDropAt(null);
    const onDrop = (event: DragEvent): void => {
      event.preventDefault();
      setDropAt(null);
      onDragChange(null);
      if (dragging) {
        onMove(dragging, category, placement(event));
      }
    };
    row.addEventListener('dragover', onDragOver);
    row.addEventListener('dragleave', onDragLeave);
    row.addEventListener('drop', onDrop);
    return () => {
      row.removeEventListener('dragover', onDragOver);
      row.removeEventListener('dragleave', onDragLeave);
      row.removeEventListener('drop', onDrop);
    };
  }, [accepts, dragging, category, onMove, onDragChange]);

  return (
    <div
      ref={rowRef}
      className={styles.row}
      data-archived={archived || undefined}
      data-drop={accepts ? (dropAt ?? undefined) : undefined}
      data-category-id={category.id}
    >
      {allowed.reorder ? (
        <button
          type="button"
          className={styles.handle}
          draggable
          data-drag-handle={category.id}
          title={t('category.dragHandle', { name: category.name })}
          aria-label={t('category.dragHandle', { name: category.name })}
          onKeyDown={onHandleKeyDown}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', category.id);
            onDragChange(category);
          }}
          onDragEnd={() => onDragChange(null)}
        >
          <GripVertical aria-hidden="true" size={16} />
        </button>
      ) : (
        <span className={styles.handleSpacer} aria-hidden="true" />
      )}
      <CategoryChip icon={category.icon} color={category.color} size={topLevel ? 'md' : 'sm'} />
      <span className={styles.rowText}>
        <span className={styles.rowName}>{category.name}</span>
        {topLevel && childCount > 0 && (
          <span className={styles.rowMeta}>{t('category.childCount', { count: childCount })}</span>
        )}
      </span>
      {category.isSystem && <span className={styles.badge}>{t('category.systemBadge')}</span>}
      {archived && (
        <span className={[styles.badge, styles.badgeArchived].join(' ')}>
          {t('category.archivedBadge')}
        </span>
      )}
      <ActionMenu label={t('category.actionsFor', { name: category.name })} items={items} />
    </div>
  );
}

export interface CategoryTreeProps extends CategoryTreeActions {
  readonly label: string;
  readonly tree: readonly CategoryTreeNode<LocalCategory>[];
}

/** Árvore de 2 níveis com reordenação por arrasto e, pelo teclado, pelas setas na alça ou no menu. */
export function CategoryTree({ label, tree, ...actions }: CategoryTreeProps) {
  const [dragging, setDragging] = useState<LocalCategory | null>(null);
  // Só as reordenáveis contam como vizinhas: "Outros" fica sempre no fim.
  const movable = (list: readonly LocalCategory[]) => list.filter((c) => !c.isSystem);
  const parents = movable(tree.map((node) => node.category));
  const neighbors = (list: readonly LocalCategory[], category: LocalCategory) => {
    const index = list.findIndex((c) => c.id === category.id);
    return index < 0
      ? { previous: undefined, next: undefined }
      : {
          previous: list[index - 1],
          next: list[index + 1],
        };
  };

  return (
    <ul className={styles.tree} aria-label={label}>
      {tree.map((node) => {
        const children = movable(node.children);
        return (
          <li key={node.category.id} className={styles.node}>
            <CategoryRow
              {...actions}
              {...neighbors(parents, node.category)}
              category={node.category}
              archived={node.archived}
              childCount={node.children.length}
              dragging={dragging}
              onDragChange={setDragging}
            />
            {node.children.length > 0 && (
              <ul className={styles.children} aria-label={node.category.name}>
                {node.children.map((child) => (
                  <li key={child.id}>
                    <CategoryRow
                      {...actions}
                      {...neighbors(children, child)}
                      category={child}
                      archived={node.archived || child.archived}
                      childCount={0}
                      dragging={dragging}
                      onDragChange={setDragging}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
