import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type CategoryNode,
  categoryNameKey,
  categoryViolations,
  OTHER_CATEGORY,
  rejectionKind,
  violationField,
} from './category.js';

const PROFILE = 'p1';

function node(id: string, overrides: Partial<CategoryNode> = {}): CategoryNode {
  return {
    id,
    profileId: PROFILE,
    type: 'expense',
    name: id,
    parentId: null,
    isSystem: false,
    archived: false,
    deleted: false,
    ...overrides,
  };
}

const other = node('outros', { name: OTHER_CATEGORY.name, isSystem: true });
const food = node('food', { name: 'Alimentação' });
const market = node('market', { name: 'Mercado', parentId: 'food' });
const salary = node('salary', { name: 'Salário', type: 'income' });
const base = [other, food, market, salary];

const create = (after: CategoryNode, all: readonly CategoryNode[] = base) =>
  categoryViolations(null, after, all);
const update = (before: CategoryNode, patch: Partial<CategoryNode>, all = base) =>
  categoryViolations(before, { ...before, ...patch }, all);

describe('categoryNameKey (RN-CAT-07)', () => {
  it('ignora maiúsculas, espaços nas pontas e espaços repetidos', () => {
    expect(categoryNameKey('  Saúde   e  Bem-estar ')).toBe('saúde e bem-estar');
    expect(categoryNameKey('SAÚDE')).toBe(categoryNameKey('saúde'));
  });
});

describe('categoryViolations: criação', () => {
  it('categoria de primeiro nível válida não tem violação', () => {
    expect(create(node('new', { name: 'Lazer' }))).toEqual([]);
  });

  it('subcategoria sob mãe de primeiro nível do mesmo tipo é válida', () => {
    expect(create(node('new', { name: 'Restaurantes', parentId: 'food' }))).toEqual([]);
  });

  it('nome repetido no mesmo nível, sem diferenciar maiúsculas, é recusado', () => {
    expect(create(node('new', { name: 'alimentação' }))).toEqual(['nameTaken']);
    expect(create(node('new', { name: '  MERCADO ', parentId: 'food' }))).toEqual(['nameTaken']);
  });

  it('mesmo nome em outro nível, outro tipo, outro perfil ou de categoria excluída é permitido', () => {
    expect(create(node('new', { name: 'Mercado' }))).toEqual([]);
    expect(create(node('new', { name: 'Alimentação', type: 'income' }))).toEqual([]);
    expect(create(node('new', { name: 'Alimentação', profileId: 'p2' }), base)).toEqual([]);
    const gone = node('gone', { name: 'Viagem', deleted: true });
    expect(create(node('new', { name: 'Viagem' }), [...base, gone])).toEqual([]);
  });

  it('a própria categoria não conta como nome repetido', () => {
    expect(update(food, { name: 'ALIMENTAÇÃO' })).toEqual([]);
  });

  it('mãe inexistente, de outro perfil ou excluída é recusada', () => {
    expect(create(node('new', { parentId: 'nope' }))).toEqual(['parentMissing']);
    const foreign = node('foreign', { profileId: 'p2' });
    expect(create(node('new', { parentId: 'foreign' }), [...base, foreign])).toEqual([
      'parentMissing',
    ]);
    const gone = node('gone', { deleted: true });
    expect(create(node('new', { parentId: 'gone' }), [...base, gone])).toEqual(['parentDeleted']);
  });

  it('no máximo 2 níveis: a mãe precisa ser de primeiro nível', () => {
    expect(create(node('new', { parentId: 'market' }))).toEqual(['parentNested']);
  });

  it('subcategoria tem o mesmo tipo da mãe', () => {
    expect(create(node('new', { parentId: 'salary' }))).toEqual(['parentTypeMismatch']);
  });

  it('"Outros" não recebe filhas', () => {
    expect(create(node('new', { parentId: 'outros' }))).toEqual(['parentSystem']);
  });

  it('categoria não pode ser mãe de si mesma', () => {
    expect(update(food, { parentId: 'food' })).toContain('parentSelf');
  });

  it('cliente não cria categoria de sistema', () => {
    expect(create(node('new', { name: 'Sistema', isSystem: true }))).toEqual(['systemReserved']);
  });

  it('filha sob mãe arquivada é aceita (fica arquivada por derivação)', () => {
    const archived = node('trip', { name: 'Viagem', archived: true });
    expect(create(node('new', { parentId: 'trip' }), [...base, archived])).toEqual([]);
  });

  it('categoria criada já excluída não precisa de mãe válida', () => {
    expect(create(node('new', { parentId: 'nope', deleted: true }))).toEqual([]);
  });
});

describe('categoryViolations: alteração', () => {
  it('tipo e perfil não mudam depois de criada', () => {
    expect(update(food, { type: 'income' })).toContain('typeChanged');
    expect(update(salary, { profileId: 'p2' })).toContain('profileChanged');
  });

  it('categoria com filhas não vira filha', () => {
    const health = node('health', { name: 'Saúde' });
    expect(update(food, { parentId: 'health' }, [...base, health])).toEqual(['hasChildren']);
  });

  it('filha excluída não impede a mãe de virar filha', () => {
    const health = node('health', { name: 'Saúde' });
    const all = [...base.filter((c) => c.id !== 'market'), { ...market, deleted: true }, health];
    expect(update(food, { parentId: 'health' }, all)).toEqual([]);
  });

  it('filha pode voltar ao primeiro nível e mudar de mãe', () => {
    const health = node('health', { name: 'Saúde' });
    expect(update(market, { parentId: null })).toEqual([]);
    expect(update(market, { parentId: 'health' }, [...base, health])).toEqual([]);
  });

  it('arquivar e desarquivar são permitidos', () => {
    expect(update(food, { archived: true })).toEqual([]);
    expect(update({ ...food, archived: true }, { archived: false })).toEqual([]);
  });

  it('excluir é definitivo: não volta a existir', () => {
    expect(update({ ...food, deleted: true }, { deleted: false })).toEqual(['undeleted']);
  });

  it('editar categoria já excluída é inofensivo (absorvido pela exclusão)', () => {
    const gone = { ...market, deleted: true, parentId: 'nope' };
    expect(update(gone, { name: 'Outro nome' })).toEqual([]);
  });
});

describe('categoryViolations: "Outros" (RN-CAT-03)', () => {
  it('ícone e cor podem mudar (não fazem parte das regras)', () => {
    expect(update(other, {})).toEqual([]);
  });

  it.each([
    ['excluir', { deleted: true }, 'systemDeleted'],
    ['arquivar', { archived: true }, 'systemArchived'],
    ['renomear', { name: 'Diversos' }, 'systemRenamed'],
    ['virar filha', { parentId: 'food' }, 'systemMoved'],
    ['perder a marca de sistema', { isSystem: false }, 'systemFlagChanged'],
  ] as const)('não pode %s', (_, patch, violation) => {
    expect(update(other, patch)).toContain(violation);
  });

  it('categoria comum não vira de sistema', () => {
    expect(update(food, { isSystem: true })).toContain('systemFlagChanged');
  });

  it('renomear só mudando maiúsculas também é recusado', () => {
    expect(update(other, { name: 'OUTROS' })).toEqual(['systemRenamed']);
  });
});

describe('violationField e rejectionKind', () => {
  it('liga a violação ao campo do formulário quando houver', () => {
    expect(violationField('nameTaken')).toBe('name');
    expect(violationField('systemRenamed')).toBe('name');
    expect(violationField('parentNested')).toBe('parentId');
    expect(violationField('hasChildren')).toBe('parentId');
    expect(violationField('systemMoved')).toBe('parentId');
    expect(violationField('systemDeleted')).toBeNull();
    expect(violationField('typeChanged')).toBeNull();
  });

  it('nome repetido é conflito; as demais são entrada inválida', () => {
    expect(rejectionKind(['nameTaken'])).toBe('conflict');
    expect(rejectionKind(['parentNested', 'nameTaken'])).toBe('invalid');
    expect(rejectionKind(['systemDeleted'])).toBe('invalid');
  });
});

/**
 * Modelo: perfil com "Outros" por tipo e operações aleatórias. Só as operações sem violação são
 * aplicadas (como no servidor); os invariantes valem depois de qualquer sequência.
 */
const IDS = ['a', 'b', 'c', 'd', 'e'] as const;
const NAMES = ['Casa', 'casa', 'CASA ', 'Lazer', 'Outros'] as const;

const operation = fc.oneof(
  fc.record({
    kind: fc.constant('create' as const),
    id: fc.constantFrom(...IDS),
    name: fc.constantFrom(...NAMES),
    type: fc.constantFrom('income' as const, 'expense' as const),
    parentId: fc.option(fc.constantFrom<string>(...IDS, 'sys-expense', 'sys-income')),
  }),
  fc.record({
    kind: fc.constant('move' as const),
    id: fc.constantFrom<string>(...IDS, 'sys-expense'),
    parentId: fc.option(fc.constantFrom<string>(...IDS, 'sys-expense')),
  }),
  fc.record({
    kind: fc.constant('rename' as const),
    id: fc.constantFrom<string>(...IDS, 'sys-income'),
    name: fc.constantFrom(...NAMES, 'Diversos'),
  }),
  fc.record({
    kind: fc.constant('archive' as const),
    id: fc.constantFrom<string>(...IDS, 'sys-expense'),
    archived: fc.boolean(),
  }),
  fc.record({
    kind: fc.constant('delete' as const),
    id: fc.constantFrom<string>(...IDS, 'sys-income'),
  }),
);

type Operation = typeof operation extends fc.Arbitrary<infer T> ? T : never;

function initialProfile(): Map<string, CategoryNode> {
  return new Map([
    ['sys-expense', node('sys-expense', { name: 'Outros', isSystem: true })],
    ['sys-income', node('sys-income', { name: 'Outros', isSystem: true, type: 'income' })],
  ]);
}

function proposal(state: Map<string, CategoryNode>, op: Operation): CategoryNode | null {
  const before = state.get(op.id);
  switch (op.kind) {
    case 'create':
      return before ? null : node(op.id, { name: op.name, type: op.type, parentId: op.parentId });
    case 'move':
      return before ? { ...before, parentId: op.parentId } : null;
    case 'rename':
      return before ? { ...before, name: op.name } : null;
    case 'archive':
      return before ? { ...before, archived: op.archived } : null;
    case 'delete':
      return before ? { ...before, deleted: true } : null;
  }
}

function apply(state: Map<string, CategoryNode>, op: Operation): void {
  const after = proposal(state, op);
  if (!after) {
    return;
  }
  const before = state.get(op.id) ?? null;
  if (categoryViolations(before, after, [...state.values()]).length > 0) {
    return;
  }
  state.set(after.id, after);
  if (after.deleted) {
    for (const child of state.values()) {
      if (child.parentId === after.id) {
        state.set(child.id, { ...child, deleted: true });
      }
    }
  }
}

function assertInvariants(state: Map<string, CategoryNode>): void {
  const live = [...state.values()].filter((c) => !c.deleted);
  for (const category of live) {
    if (category.parentId !== null) {
      const parent = state.get(category.parentId);
      // 2 níveis: a mãe existe, está viva, é de primeiro nível, do mesmo tipo e não é "Outros".
      expect(parent?.deleted).toBe(false);
      expect(parent?.parentId).toBeNull();
      expect(parent?.type).toBe(category.type);
      expect(parent?.isSystem).toBe(false);
    }
    const siblings = live.filter(
      (c) =>
        c.type === category.type &&
        c.parentId === category.parentId &&
        categoryNameKey(c.name) === categoryNameKey(category.name),
    );
    expect(siblings).toHaveLength(1);
  }
  // "Outros" protegida: uma por tipo, viva, sem mãe, não arquivada e com o nome original.
  for (const id of ['sys-expense', 'sys-income']) {
    expect(state.get(id)).toMatchObject({
      name: 'Outros',
      isSystem: true,
      archived: false,
      deleted: false,
      parentId: null,
    });
  }
  expect(live.filter((c) => c.isSystem)).toHaveLength(2);
}

describe('invariantes (fast-check)', () => {
  it('qualquer sequência de operações aceitas mantém 2 níveis, "Outros" protegida e nome único', () => {
    fc.assert(
      fc.property(fc.array(operation, { maxLength: 40 }), (operations) => {
        const state = initialProfile();
        for (const op of operations) {
          apply(state, op);
          assertInvariants(state);
        }
      }),
      { numRuns: 400 },
    );
  });

  it('nome repetido entre irmãs vivas é sempre recusado, em qualquer caixa', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12 }).filter((name) => name.trim() !== ''),
        fc.boolean(),
        (name, upper) => {
          const existing = node('x', { name });
          const candidate = node('y', { name: upper ? name.toUpperCase() : ` ${name} ` });
          const sameKey = categoryNameKey(candidate.name) === categoryNameKey(name);
          expect(create(candidate, [existing]).includes('nameTaken')).toBe(sameKey);
        },
      ),
    );
  });

  it('"Outros" recusa qualquer mudança de nome, arquivamento, exclusão ou mãe', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ maxLength: 10 }),
          archived: fc.boolean(),
          deleted: fc.boolean(),
          parentId: fc.option(fc.constant('food')),
        }),
        (patch) => {
          const after = { ...other, ...patch };
          const violations = categoryViolations(other, after, base);
          const changed =
            patch.name !== other.name || patch.archived || patch.deleted || patch.parentId !== null;
          expect(violations.length > 0).toBe(changed);
        },
      ),
    );
  });
});
