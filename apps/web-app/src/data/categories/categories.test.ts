import { describe, expect, it, vi } from 'vitest';
import { id, PROFILE } from '../../testing/categories-fixture.js';
import {
  type CategoriesSnapshot,
  type CategoryDraft,
  createCategory,
  deleteCategory,
  type LocalCategory,
  moveCategory,
  setCategoryArchived,
  updateCategory,
  violationErrors,
} from './categories.js';

const category = (overrides: Partial<LocalCategory> & { id: string }): LocalCategory => ({
  profileId: PROFILE,
  type: 'expense',
  name: 'Sem nome',
  parentId: null,
  isSystem: false,
  archived: false,
  deleted: false,
  sortOrder: 0,
  icon: 'tag',
  color: '#2D6E85',
  archivedAt: null,
  ...overrides,
});

const snapshot: CategoriesSnapshot = {
  profileId: PROFILE,
  categories: [
    category({ id: id(1), name: 'Alimentação' }),
    category({ id: id(2), name: 'Mercado', parentId: id(1) }),
    category({ id: id(3), name: 'Lazer', sortOrder: 1 }),
    category({ id: id(4), name: 'Antiga', deleted: true }),
    category({ id: id(6), name: 'Outros', isSystem: true, sortOrder: 9 }),
  ],
};

const draft = (overrides: Partial<CategoryDraft> = {}): CategoryDraft => ({
  name: 'Viagens',
  parentId: null,
  icon: 'plane',
  color: '#2D6E85',
  ...overrides,
});

describe('regras da tela de categorias (sem tocar o banco)', () => {
  it('sem perfil, criar falha sem gravar', async () => {
    const write = vi.fn();
    const result = await createCategory(
      write,
      { profileId: null, categories: [] },
      'expense',
      draft(),
    );
    expect(result).toEqual({ ok: false, errors: { form: 'category.errors.unexpected' } });
    expect(write).not.toHaveBeenCalled();
  });

  it('formato inválido vira mensagem por campo', async () => {
    const write = vi.fn();
    const create = (d: Partial<CategoryDraft>) =>
      createCategory(write, snapshot, 'expense', draft(d), () => id(30));
    expect(await create({ name: 'x'.repeat(61) })).toEqual({
      ok: false,
      errors: { name: 'category.errors.nameTooLong' },
    });
    expect(await create({ name: 'a\u0007b' })).toEqual({
      ok: false,
      errors: { name: 'category.errors.nameInvalid' },
    });
    expect(await create({ parentId: 'não-é-uuid' })).toMatchObject({
      ok: false,
      errors: { parentId: 'category.errors.parentSelf' },
    });
    expect(await create({ icon: '' })).toEqual({
      ok: false,
      errors: { form: 'category.errors.unexpected' },
    });
    expect(write).not.toHaveBeenCalled();
  });

  it('regra do domínio sem campo vai para o formulário', () => {
    expect(violationErrors(['systemDeleted', 'nameTaken', 'systemRenamed'])).toEqual({
      form: 'category.errors.systemDeleted',
      name: 'category.errors.nameTaken',
    });
  });

  it('editar, arquivar e excluir categoria que sumiu avisam sem gravar', async () => {
    const write = vi.fn();
    expect(await updateCategory(write, snapshot, id(4), draft())).toMatchObject({ ok: false });
    expect(await setCategoryArchived(write, snapshot, id(99), true)).toEqual({
      form: 'category.errors.parentMissing',
    });
    expect(await deleteCategory(write, snapshot, id(4))).toEqual({
      form: 'category.errors.parentMissing',
    });
    expect(await moveCategory(write, snapshot, id(99), id(1), 'after')).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('regras recusam editar nome e excluir ou arquivar "Outros"', async () => {
    const write = vi.fn();
    const outros = { name: 'Outros', parentId: null, icon: 'tag', color: '#2D6E85' };
    expect(await updateCategory(write, snapshot, id(6), { ...outros, name: 'Diversos' })).toEqual({
      ok: false,
      errors: { name: 'category.errors.systemRenamed' },
    });
    expect(await updateCategory(write, snapshot, id(6), { ...outros, name: '' })).toEqual({
      ok: false,
      errors: { name: 'category.errors.nameRequired' },
    });
    expect(await setCategoryArchived(write, snapshot, id(6), true)).toEqual({
      form: 'category.errors.systemArchived',
    });
    expect(await deleteCategory(write, snapshot, id(6))).toEqual({
      form: 'category.errors.systemDeleted',
    });
    expect(await moveCategory(write, snapshot, id(6), id(1), 'before')).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('nome que só mudou em espaços não grava; cor compara sem caixa', async () => {
    const write = vi.fn();
    const lazer = { name: ' Lazer ', parentId: null, icon: 'tag', color: '#2d6e85' };
    expect(await updateCategory(write, snapshot, id(3), lazer)).toEqual({
      ok: true,
      id: id(3),
      name: 'Lazer',
    });
    expect(write).not.toHaveBeenCalled();
    await updateCategory(write, snapshot, id(3), { ...lazer, icon: 'gift' });
    expect(write).toHaveBeenCalledWith('categories', id(3), { icon: 'gift' });
  });

  it('subcategoria não recebe filha e mover para o mesmo lugar não grava', async () => {
    const write = vi.fn();
    expect(
      await updateCategory(write, snapshot, id(3), {
        ...draft({ name: 'Lazer', icon: 'tag' }),
        parentId: id(2),
      }),
    ).toEqual({ ok: false, errors: { parentId: 'category.errors.parentNested' } });
    expect(await moveCategory(write, snapshot, id(1), id(3), 'before')).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });
});
