import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type CategoryEntry,
  categoryActions,
  categoryTree,
  deletionCascade,
  isEffectivelyArchived,
  nextSortOrder,
  parentCandidates,
  reorderSiblings,
} from './category-tree.js';

function entry(id: string, overrides: Partial<CategoryEntry> = {}): CategoryEntry {
  return {
    id,
    profileId: 'p1',
    type: 'expense',
    name: id,
    parentId: null,
    isSystem: false,
    archived: false,
    deleted: false,
    sortOrder: 0,
    ...overrides,
  };
}

const other = entry('outros', { name: 'Outros', isSystem: true, sortOrder: -5 });
const food = entry('food', { name: 'Alimentação', sortOrder: 1 });
const home = entry('home', { name: 'Casa', sortOrder: 0 });
const market = entry('market', { name: 'Mercado', parentId: 'food', sortOrder: 1 });
const bakery = entry('bakery', { name: 'Padaria', parentId: 'food', sortOrder: 0 });
const salary = entry('salary', { name: 'Salário', type: 'income' });
const all = [other, food, home, market, bakery, salary];

describe('isEffectivelyArchived (RN-CAT-02)', () => {
  it('categoria arquivada por si mesma', () => {
    expect(isEffectivelyArchived({ ...food, archived: true }, all)).toBe(true);
    expect(isEffectivelyArchived(food, all)).toBe(false);
  });

  it('filha de mãe arquivada conta como arquivada, sem gravar na filha', () => {
    const archivedFood = { ...food, archived: true };
    const categories = [archivedFood, market];
    expect(isEffectivelyArchived(market, categories)).toBe(true);
    expect(market.archived).toBe(false);
  });

  it('desarquivar a mãe devolve a filha ao estado próprio', () => {
    expect(isEffectivelyArchived(market, all)).toBe(false);
    expect(isEffectivelyArchived({ ...market, archived: true }, all)).toBe(true);
  });

  it('mãe desconhecida não arquiva a filha', () => {
    expect(isEffectivelyArchived(market, [])).toBe(false);
  });
});

describe('deletionCascade (RN-CAT-02)', () => {
  it('excluir a mãe leva as filhas vivas', () => {
    expect(deletionCascade(all, 'food').sort()).toEqual(['bakery', 'market']);
  });

  it('filha já excluída ou categoria sem filhas não entra', () => {
    const categories = [food, { ...market, deleted: true }, bakery];
    expect(deletionCascade(categories, 'food')).toEqual(['bakery']);
    expect(deletionCascade(all, 'home')).toEqual([]);
  });
});

describe('parentCandidates', () => {
  it('só primeiro nível, mesmo tipo, vivas, não arquivadas e diferentes de "Outros" e de si', () => {
    const archived = entry('trip', { name: 'Viagem', archived: true });
    const gone = entry('gone', { deleted: true });
    const foreign = entry('foreign', { profileId: 'p2' });
    const categories = [...all, archived, gone, foreign];
    const ids = (selfId: string | null) =>
      parentCandidates(categories, { profileId: 'p1', type: 'expense', selfId }).map((c) => c.id);
    expect(ids(null)).toEqual(['home', 'food']);
    expect(ids('home')).toEqual(['food']);
    expect(ids('market')).toEqual(['home', 'food']);
  });

  it('categoria com filhas não pode ter mãe', () => {
    expect(parentCandidates(all, { profileId: 'p1', type: 'expense', selfId: 'food' })).toEqual([]);
  });

  it('receitas oferecem só mães de receita', () => {
    const ids = parentCandidates(all, { profileId: 'p1', type: 'income', selfId: null }).map(
      (c) => c.id,
    );
    expect(ids).toEqual(['salary']);
  });
});

describe('categoryActions (RN-CAT-03)', () => {
  it('"Outros" só edita ícone e cor', () => {
    expect(categoryActions(other)).toEqual({
      rename: false,
      changeParent: false,
      archive: false,
      remove: false,
      reorder: false,
    });
  });

  it('categoria comum tem todas as ações', () => {
    expect(categoryActions(food)).toEqual({
      rename: true,
      changeParent: true,
      archive: true,
      remove: true,
      reorder: true,
    });
  });
});

describe('categoryTree', () => {
  it('monta mães e filhas por ordem manual, com "Outros" no fim', () => {
    const tree = categoryTree(all, { profileId: 'p1', type: 'expense', includeArchived: false });
    expect(tree.map((n) => [n.category.id, n.children.map((c) => c.id)])).toEqual([
      ['home', []],
      ['food', ['bakery', 'market']],
      ['outros', []],
    ]);
  });

  it('empate de ordem cai no nome e depois no id', () => {
    const a = entry('z', { name: 'Beta' });
    const b = entry('y', { name: 'Alfa' });
    const c = entry('x', { name: 'Alfa' });
    const tree = categoryTree([a, b, c], {
      profileId: 'p1',
      type: 'expense',
      includeArchived: false,
    });
    expect(tree.map((n) => n.category.id)).toEqual(['x', 'y', 'z']);
  });

  it('esconde arquivadas (próprias e derivadas) e excluídas, salvo se pedir arquivadas', () => {
    const categories = [{ ...food, archived: true }, market, home, { ...bakery, deleted: true }];
    const hidden = categoryTree(categories, {
      profileId: 'p1',
      type: 'expense',
      includeArchived: false,
    });
    expect(hidden.map((n) => n.category.id)).toEqual(['home']);
    const shown = categoryTree(categories, {
      profileId: 'p1',
      type: 'expense',
      includeArchived: true,
    });
    expect(shown.map((n) => [n.category.id, n.archived, n.children.map((c) => c.id)])).toEqual([
      ['home', false, []],
      ['food', true, ['market']],
    ]);
  });

  it('descarta filhas órfãs e de outro perfil ou tipo', () => {
    const orphan = entry('orphan', { parentId: 'nope' });
    const tree = categoryTree([...all, orphan, entry('p2cat', { profileId: 'p2' })], {
      profileId: 'p1',
      type: 'expense',
      includeArchived: true,
    });
    expect(tree.map((n) => n.category.id)).toEqual(['home', 'food', 'outros']);
  });
});

describe('reorderSiblings (RF-CAT-05)', () => {
  const siblings = [
    entry('a', { sortOrder: 0 }),
    entry('b', { sortOrder: 1 }),
    entry('c', { sortOrder: 2 }),
  ];

  it('move antes ou depois do alvo e renumera só quem mudou', () => {
    expect(reorderSiblings(siblings, 'c', 'a', 'before')).toEqual([
      { id: 'c', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
      { id: 'b', sortOrder: 2 },
    ]);
    expect(reorderSiblings(siblings, 'a', 'b', 'after')).toEqual([
      { id: 'b', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
    ]);
  });

  it('mover para o mesmo lugar ou com id desconhecido não muda nada', () => {
    expect(reorderSiblings(siblings, 'b', 'b', 'before')).toEqual([]);
    expect(reorderSiblings(siblings, 'a', 'b', 'before')).toEqual([]);
    expect(reorderSiblings(siblings, 'x', 'a', 'before')).toEqual([]);
    expect(reorderSiblings(siblings, 'a', 'x', 'before')).toEqual([]);
  });

  it('o resultado é sempre uma permutação de 0..n-1 com o movido junto ao alvo', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: -50, max: 50 }), { minLength: 2, maxLength: 8 }),
        fc.nat(),
        fc.nat(),
        fc.boolean(),
        (orders, from, to, before) => {
          const list = orders.map((sortOrder, i) => entry(`n${i}`, { sortOrder }));
          const moved = list[from % list.length]?.id ?? '';
          const target = list[to % list.length]?.id ?? '';
          const changes = reorderSiblings(list, moved, target, before ? 'before' : 'after');
          const result = new Map(list.map((c) => [c.id, c.sortOrder]));
          for (const change of changes) {
            result.set(change.id, change.sortOrder);
          }
          const ordered = [...result.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => id);
          if (moved !== target) {
            const offset = ordered.indexOf(target) - ordered.indexOf(moved);
            expect(offset).toBe(before ? 1 : -1);
          }
          for (const change of changes) {
            expect(list.find((c) => c.id === change.id)?.sortOrder).not.toBe(change.sortOrder);
          }
        },
      ),
    );
  });
});

describe('nextSortOrder', () => {
  it('vai para o fim das irmãs vivas', () => {
    expect(nextSortOrder(all, { profileId: 'p1', type: 'expense', parentId: 'food' })).toBe(2);
    expect(nextSortOrder(all, { profileId: 'p1', type: 'income', parentId: null })).toBe(1);
    expect(nextSortOrder([], { profileId: 'p1', type: 'income', parentId: null })).toBe(0);
  });
});
