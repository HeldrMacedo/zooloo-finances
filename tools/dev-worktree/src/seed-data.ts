/**
 * Dados SINTÉTICOS do ambiente local (doc 12 §9): pessoas fictícias, domínio reservado `.test`.
 * IDs fixos (UUIDv7 válidos) para o seed ser idempotente e os testes manuais reproduzíveis.
 * Não é a lista oficial de categorias do onboarding (RF-ONB-02), que ainda não foi definida.
 */
export const SEED_HLC = '0000000000000:0000:seed';

export interface SeedCategory {
  readonly id: string;
  readonly type: 'income' | 'expense';
  readonly name: string;
  readonly parentId: string | null;
  readonly icon: string;
  readonly color: string;
  readonly isSystem: boolean;
}

export interface SeedUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly profile: { readonly id: string; readonly name: string; readonly currency: string };
  readonly categories: readonly SeedCategory[];
}

/** UUIDv7 fixo: dígitos de usuário, entidade e índice no 4º grupo. */
const uuid = (user: number, entity: number, index: number): string =>
  `01960000-0000-7000-8${user}${entity}${index.toString(16)}-${'0'.repeat(12)}`;

function category(
  user: number,
  index: number,
  type: SeedCategory['type'],
  name: string,
  icon: string,
  color: string,
  options: { parent?: number; system?: boolean } = {},
): SeedCategory {
  return {
    id: uuid(user, 3, index),
    type,
    name,
    parentId: options.parent === undefined ? null : uuid(user, 3, options.parent),
    icon,
    color,
    isSystem: options.system ?? false,
  };
}

function categoriesFor(user: number): SeedCategory[] {
  return [
    category(user, 1, 'expense', 'Alimentação', 'utensils', '#F47C3C'),
    category(user, 2, 'expense', 'Mercado', 'shopping-cart', '#F47C3C', { parent: 1 }),
    category(user, 3, 'expense', 'Restaurantes', 'chef-hat', '#F47C3C', { parent: 1 }),
    category(user, 4, 'expense', 'Moradia', 'house', '#142B3B'),
    category(user, 5, 'expense', 'Transporte', 'bus', '#16B89A'),
    category(user, 6, 'expense', 'Saúde', 'heart-pulse', '#B91C1C'),
    category(user, 7, 'expense', 'Lazer', 'party-popper', '#FFC857'),
    category(user, 8, 'expense', 'Outros', 'circle-ellipsis', '#5B6B77', { system: true }),
    category(user, 9, 'income', 'Salário', 'briefcase', '#15803D'),
    category(user, 10, 'income', 'Outros', 'circle-ellipsis', '#5B6B77', { system: true }),
  ];
}

export const SEED_USERS: readonly SeedUser[] = [
  {
    id: uuid(1, 1, 1),
    email: 'ana.sintetica@zooloo.test',
    name: 'Ana Sintética',
    profile: { id: uuid(1, 2, 1), name: 'Pessoal', currency: 'BRL' },
    categories: categoriesFor(1),
  },
  {
    id: uuid(2, 1, 1),
    email: 'bruno.sintetico@zooloo.test',
    name: 'Bruno Sintético',
    profile: { id: uuid(2, 2, 1), name: 'Pessoal', currency: 'BRL' },
    categories: categoriesFor(2),
  },
];
