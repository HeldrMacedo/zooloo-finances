import { describe, expect, it } from 'vitest';
import {
  CategoryCreateSchema,
  CategoryNameSchema,
  CategorySchema,
  CategoryUpdateSchema,
} from './category.js';

const ID = '0196f3a2-7c1e-7b3a-9c2d-1234567890ab';
const PARENT = '0196f3a2-7c1e-7b3a-9c2d-1234567890ac';
const PROFILE = '0196f3a2-7c1e-7b3a-9c2d-1234567890ad';

const validCreate = {
  id: ID,
  type: 'expense',
  name: 'Alimentação',
  icon: 'utensils',
  color: '#16b89a',
};

describe('CategoryNameSchema (RN-CAT-07)', () => {
  it('apara espaços e colapsa espaços internos', () => {
    expect(CategoryNameSchema.parse('  Casa   e  moradia ')).toBe('Casa e moradia');
  });

  it.each(['', '   ', 'a'.repeat(61), 'Mercado\u0000', 'Linha\nnova'])('recusa %j', (value) => {
    expect(CategoryNameSchema.safeParse(value).success).toBe(false);
  });

  it('aceita 60 caracteres e acentos', () => {
    expect(CategoryNameSchema.parse('é'.repeat(60))).toHaveLength(60);
  });
});

describe('CategoryCreateSchema', () => {
  it('normaliza a entrada e define parentId nulo por padrão', () => {
    expect(CategoryCreateSchema.parse(validCreate)).toEqual({
      ...validCreate,
      color: '#16B89A',
      parentId: null,
    });
  });

  it('aceita subcategoria', () => {
    expect(CategoryCreateSchema.parse({ ...validCreate, parentId: PARENT }).parentId).toBe(PARENT);
  });

  it('recusa campos desconhecidos, tipo inválido e ícone fora do padrão', () => {
    expect(CategoryCreateSchema.safeParse({ ...validCreate, isSystem: true }).success).toBe(false);
    expect(CategoryCreateSchema.safeParse({ ...validCreate, type: 'transfer' }).success).toBe(
      false,
    );
    expect(CategoryCreateSchema.safeParse({ ...validCreate, icon: 'Utensils' }).success).toBe(
      false,
    );
    expect(CategoryCreateSchema.safeParse({ ...validCreate, icon: '' }).success).toBe(false);
  });

  it.each(['shopping-cart', 'a', 'x9'])('aceita ícone %s', (icon) => {
    expect(CategoryCreateSchema.parse({ ...validCreate, icon }).icon).toBe(icon);
  });

  it.each(['-a', 'a-', 'a--b', 'a'.repeat(41)])('recusa ícone %s', (icon) => {
    expect(CategoryCreateSchema.safeParse({ ...validCreate, icon }).success).toBe(false);
  });

  it('subcategoria não pode ser pai de si mesma', () => {
    const result = CategoryCreateSchema.safeParse({ ...validCreate, parentId: ID });
    expect(result.error?.issues[0]?.path).toEqual(['parentId']);
  });
});

describe('CategoryUpdateSchema', () => {
  it('aceita alteração parcial', () => {
    expect(CategoryUpdateSchema.parse({ name: ' Mercado ' })).toEqual({ name: 'Mercado' });
    expect(CategoryUpdateSchema.parse({ parentId: null, sortOrder: 3 })).toEqual({
      parentId: null,
      sortOrder: 3,
    });
  });

  it('exige ao menos um campo', () => {
    expect(CategoryUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('não permite trocar o tipo nem o id', () => {
    expect(CategoryUpdateSchema.safeParse({ type: 'income' }).success).toBe(false);
    expect(CategoryUpdateSchema.safeParse({ id: ID }).success).toBe(false);
  });

  it('ordem é inteiro não negativo', () => {
    expect(CategoryUpdateSchema.safeParse({ sortOrder: -1 }).success).toBe(false);
    expect(CategoryUpdateSchema.safeParse({ sortOrder: 1.5 }).success).toBe(false);
  });
});

describe('CategorySchema (resposta da API)', () => {
  it('valida a categoria completa', () => {
    const category = {
      id: ID,
      profileId: PROFILE,
      type: 'income',
      name: 'Outros',
      parentId: null,
      icon: 'circle-ellipsis',
      color: '#5B6B77',
      isSystem: true,
      archivedAt: null,
      sortOrder: 0,
      createdAt: '2026-11-18T13:00:00.000Z',
      updatedAt: '2026-11-18T13:00:00.000Z',
    };
    expect(CategorySchema.parse(category)).toEqual(category);
  });
});
