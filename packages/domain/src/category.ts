/**
 * Regras de categorias (RN-CAT-01, 02, 03 e 07), usadas no aparelho antes de gravar e no servidor
 * ao validar cada mutação do sync contra o estado atual.
 */

export type CategoryType = 'income' | 'expense';

/** Visão de uma categoria que basta para as regras. `archived` é o estado próprio, não o derivado. */
export interface CategoryNode {
  readonly id: string;
  readonly profileId: string;
  readonly type: CategoryType;
  readonly name: string;
  readonly parentId: string | null;
  readonly isSystem: boolean;
  readonly archived: boolean;
  readonly deleted: boolean;
}

export type CategoryViolation =
  | 'typeChanged'
  | 'profileChanged'
  | 'systemReserved'
  | 'systemFlagChanged'
  | 'systemRenamed'
  | 'systemArchived'
  | 'systemDeleted'
  | 'systemMoved'
  | 'undeleted'
  | 'nameTaken'
  | 'parentSelf'
  | 'parentMissing'
  | 'parentDeleted'
  | 'parentNested'
  | 'parentTypeMismatch'
  | 'parentSystem'
  | 'hasChildren';

/** "Outros": criada pelo servidor com o perfil, uma por tipo (RN-CAT-03). */
export const OTHER_CATEGORY = {
  name: 'Outros',
  icon: 'circle-ellipsis',
  color: '#5B6B77',
} as const;

/** Chave de unicidade do nome (RN-CAT-07): sem diferenciar maiúsculas nem espaços extras. */
export function categoryNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Violações de uma criação (`before` nulo) ou alteração de categoria.
 * `categories` é o estado atual conhecido do perfil (pode conter `before` e registros de outros
 * perfis, que são ignorados).
 */
export function categoryViolations(
  before: CategoryNode | null,
  after: CategoryNode,
  categories: readonly CategoryNode[],
): CategoryViolation[] {
  const violations = [...identityViolations(before, after), ...systemViolations(before, after)];
  if (before?.deleted) {
    // Exclusão é definitiva; qualquer outra edição de registro excluído é absorvida.
    return after.deleted ? violations : [...violations, 'undeleted'];
  }
  if (after.deleted) {
    return violations;
  }
  const others = categories.filter((c) => c.id !== after.id && c.profileId === after.profileId);
  return [...violations, ...nameViolations(after, others), ...structureViolations(after, others)];
}

function identityViolations(before: CategoryNode | null, after: CategoryNode): CategoryViolation[] {
  if (before === null) {
    return after.isSystem ? ['systemReserved'] : [];
  }
  const violations: CategoryViolation[] = [];
  if (before.type !== after.type) {
    violations.push('typeChanged');
  }
  if (before.profileId !== after.profileId) {
    violations.push('profileChanged');
  }
  if (before.isSystem !== after.isSystem) {
    violations.push('systemFlagChanged');
  }
  return violations;
}

function systemViolations(before: CategoryNode | null, after: CategoryNode): CategoryViolation[] {
  if (!before?.isSystem) {
    return [];
  }
  const violations: CategoryViolation[] = [];
  if (before.name !== after.name) {
    violations.push('systemRenamed');
  }
  if (after.archived) {
    violations.push('systemArchived');
  }
  if (after.deleted) {
    violations.push('systemDeleted');
  }
  if (after.parentId !== null) {
    violations.push('systemMoved');
  }
  return violations;
}

function nameViolations(after: CategoryNode, others: readonly CategoryNode[]): CategoryViolation[] {
  const key = categoryNameKey(after.name);
  const taken = others.some(
    (c) =>
      !c.deleted &&
      c.type === after.type &&
      c.parentId === after.parentId &&
      categoryNameKey(c.name) === key,
  );
  return taken ? ['nameTaken'] : [];
}

function structureViolations(
  after: CategoryNode,
  others: readonly CategoryNode[],
): CategoryViolation[] {
  if (after.parentId === null) {
    return [];
  }
  if (after.parentId === after.id) {
    return ['parentSelf'];
  }
  const violations: CategoryViolation[] = [];
  if (others.some((c) => c.parentId === after.id && !c.deleted)) {
    violations.push('hasChildren');
  }
  const parent = others.find((c) => c.id === after.parentId);
  if (parent === undefined) {
    return [...violations, 'parentMissing'];
  }
  if (parent.deleted) {
    return [...violations, 'parentDeleted'];
  }
  if (parent.parentId !== null) {
    violations.push('parentNested');
  }
  if (parent.type !== after.type) {
    violations.push('parentTypeMismatch');
  }
  if (parent.isSystem) {
    violations.push('parentSystem');
  }
  return violations;
}

/** Campo do formulário ao qual a violação se liga, quando houver. */
export function violationField(violation: CategoryViolation): 'name' | 'parentId' | null {
  switch (violation) {
    case 'nameTaken':
    case 'systemRenamed':
      return 'name';
    case 'parentSelf':
    case 'parentMissing':
    case 'parentDeleted':
    case 'parentNested':
    case 'parentTypeMismatch':
    case 'parentSystem':
    case 'hasChildren':
    case 'systemMoved':
      return 'parentId';
    default:
      return null;
  }
}

/** Motivo da recusa no sync: nome repetido é conflito de estado; o resto é entrada inválida. */
export function rejectionKind(violations: readonly CategoryViolation[]): 'conflict' | 'invalid' {
  return violations.every((v) => v === 'nameTaken') ? 'conflict' : 'invalid';
}
