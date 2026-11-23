import { act, createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { categories } from '@zooloo/db-schema/local';
import { categoryColor } from '@zooloo/ui-tokens';
import { eq } from 'drizzle-orm';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FakeTransport,
  id,
  SAMPLE,
  type SeedCategory,
  seededDatabase,
  USER,
} from '../../../testing/categories-fixture.js';
import { axeViolations, renderApp } from '../../../testing/render.js';

async function open(
  seed: readonly SeedCategory[] = SAMPLE,
  options: { withProfile?: boolean; transport?: FakeTransport } = {},
) {
  const orm = await seededDatabase(seed, options);
  const transport = options.transport ?? new FakeTransport();
  const view = renderApp('/categorias', { sync: { orm, userId: USER, transport } });
  await screen.findByRole('list', { name: 'Categorias de Despesas' });
  return { ...view, orm, transport };
}

const list = () => screen.getByRole('list', { name: /^Categorias de / });
const topLevelNames = () =>
  Array.from(list().children, (item) => item.querySelector('[class*="rowName"]')?.textContent);
const actions = async (name: string) => {
  await userEvent.click(screen.getByRole('button', { name: `Ações de ${name}` }));
  return screen.getByRole('menu', { name: `Ações de ${name}` });
};
const choose = async (name: string, item: string) => {
  await userEvent.click(within(await actions(name)).getByRole('menuitem', { name: item }));
};
const childNames = (parent: string) =>
  Array.from(
    screen.getByRole('list', { name: parent }).querySelectorAll('[class*="rowName"]'),
    (name) => name.textContent,
  );
const dialog = () => screen.getByRole('dialog');
const row = (orm: SqliteRemoteDatabase, categoryId: string) =>
  orm.select().from(categories).where(eq(categories.id, categoryId));

afterEach(() => {
  Reflect.deleteProperty(navigator, 'onLine');
});

describe('tela de categorias (RF-CAT-01, 02 e 05)', () => {
  it('mostra carregando e depois a árvore de despesas, sem violações de acessibilidade', async () => {
    const orm = await seededDatabase();
    const { container } = renderApp('/categorias', {
      sync: { orm, userId: USER, transport: new FakeTransport() },
    });
    expect(screen.getByText('Carregando categorias…')).toBeDefined();
    await screen.findByRole('list', { name: 'Categorias de Despesas' });
    expect(topLevelNames()).toEqual(['Alimentação', 'Moradia', 'Lazer', 'Outros']);
    expect(childNames('Alimentação')).toEqual(['Mercado', 'Restaurantes']);
    expect(screen.getByText('2 subcategorias')).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('"Outros" aparece sem as ações que a regra proíbe', async () => {
    await open();
    const menu = await actions('Outros');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Editar']);
    expect(screen.queryByRole('button', { name: 'Arrastar Outros para reordenar' })).toBeNull();
    expect(within(await actions('Alimentação')).getAllByRole('menuitem').length).toBe(5);
  });

  it('abas trocam de tipo pelas setas do teclado', async () => {
    await open();
    const expense = screen.getByRole('tab', { name: 'Despesas' });
    expect(expense.getAttribute('aria-selected')).toBe('true');
    expense.focus();
    await userEvent.keyboard('{ArrowRight}');
    const income = screen.getByRole('tab', { name: 'Receitas' });
    expect(income.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(income);
    expect(topLevelNames()).toEqual(['Salário', 'Outros']);
    await userEvent.keyboard('{Home}');
    expect(topLevelNames()).toEqual(['Alimentação', 'Moradia', 'Lazer', 'Outros']);
  });

  it('cria categoria com ícone e cor e envia ao servidor', async () => {
    const { transport, container } = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Nova categoria' }));
    expect(dialog().textContent).toContain('Nova categoria');
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.type(within(dialog()).getByLabelText('Nome'), '  Educação  ');
    await userEvent.click(within(dialog()).getByRole('radio', { name: 'Livro' }));
    await userEvent.click(within(dialog()).getByRole('radio', { name: 'Roxo' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Categoria "Educação" criada.')).toBeDefined();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(topLevelNames()).toEqual(['Alimentação', 'Moradia', 'Lazer', 'Educação', 'Outros']);
    await waitFor(() => expect(transport.pushed).toHaveLength(1));
    expect(transport.pushed[0]?.fields).toMatchObject({
      name: 'Educação',
      icon: 'book-open',
      color: categoryColor.purple.light,
      type: 'expense',
      parentId: null,
      sortOrder: 3,
    });
    expect(transport.pushed[0]?.fields).not.toHaveProperty('isSystem');
  });

  it('cria subcategoria pelo menu da mãe', async () => {
    await open();
    await choose('Moradia', 'Nova subcategoria');
    expect(dialog().textContent).toContain('Nova subcategoria');
    expect((within(dialog()).getByLabelText('Categoria mãe') as HTMLSelectElement).value).toBe(
      id(4),
    );
    await userEvent.type(within(dialog()).getByLabelText('Nome'), 'Aluguel');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    const children = await screen.findByRole('list', { name: 'Moradia' });
    expect(children.textContent).toContain('Aluguel');
  });

  it('erros de regra e de formato ficam ligados ao campo, em pt-BR', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Nova categoria' }));
    const name = within(dialog()).getByLabelText('Nome');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBeTruthy();
    expect(dialog().textContent).toContain('Informe o nome da categoria.');

    await userEvent.type(name, 'MORADIA');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    expect(dialog().textContent).toContain('Já existe uma categoria com esse nome neste nível.');

    // O mesmo nome sob outra mãe é permitido.
    await userEvent.selectOptions(within(dialog()).getByLabelText('Categoria mãe'), id(1));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Categoria "MORADIA" criada.')).toBeDefined();
  });

  it('mãe só lista primeiro nível do mesmo tipo, não arquivado e sem "Outros"', async () => {
    await open([...SAMPLE, { id: id(9), name: 'Viagens', archived: true, sortOrder: 3 }]);
    await choose('Lazer', 'Editar');
    const select = within(dialog()).getByLabelText('Categoria mãe');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Nenhuma (primeiro nível)', 'Alimentação', 'Moradia']);
  });

  it('move categoria para outra mãe e trava a mãe de quem tem filhas', async () => {
    const { orm } = await open();
    await choose('Alimentação', 'Editar');
    const parent = within(dialog()).getByLabelText('Categoria mãe') as HTMLSelectElement;
    expect(parent.disabled).toBe(true);
    expect(dialog().textContent).toContain('Esta categoria tem subcategorias');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Cancelar' }));

    await choose('Lazer', 'Editar');
    await userEvent.selectOptions(within(dialog()).getByLabelText('Categoria mãe'), id(4));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Categoria "Lazer" salva.')).toBeDefined();
    expect((await screen.findByRole('list', { name: 'Moradia' })).textContent).toContain('Lazer');
    expect((await row(orm, id(5)))[0]).toMatchObject({ parentId: id(4), sortOrder: 0 });
  });

  it('salvar sem mudanças não grava nada', async () => {
    const { transport } = await open();
    await choose('Lazer', 'Editar');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Categoria "Lazer" salva.')).toBeDefined();
    expect(transport.pushed).toHaveLength(0);
  });

  it('"Outros" só muda ícone e cor', async () => {
    const { orm, transport } = await open();
    await choose('Outros', 'Editar');
    expect(dialog().textContent).toContain('só o ícone e a cor podem mudar');
    expect((within(dialog()).getByLabelText('Nome') as HTMLInputElement).disabled).toBe(true);
    expect((within(dialog()).getByLabelText('Categoria mãe') as HTMLSelectElement).disabled).toBe(
      true,
    );
    await userEvent.click(within(dialog()).getByRole('radio', { name: 'Azul' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Categoria "Outros" salva.')).toBeDefined();
    expect((await row(orm, id(6)))[0]?.color).toBe(categoryColor.blue.light);
    await waitFor(() => expect(transport.pushed[0]?.fields).toEqual({ color: '#2F5FA8' }));
  });

  it('arquiva a mãe (filhas somem junto), mostra arquivadas e desarquiva', async () => {
    const { orm } = await open();
    await choose('Alimentação', 'Arquivar');
    expect(await screen.findByText('Categoria "Alimentação" arquivada.')).toBeDefined();
    expect(topLevelNames()).toEqual(['Moradia', 'Lazer', 'Outros']);
    // Estado derivado: as filhas não são gravadas.
    expect((await row(orm, id(2)))[0]?.archivedAt).toBeNull();

    await userEvent.click(screen.getByRole('switch', { name: 'Mostrar arquivadas' }));
    expect(topLevelNames()).toEqual(['Alimentação', 'Moradia', 'Lazer', 'Outros']);
    expect(screen.getAllByText('Arquivada')).toHaveLength(3);

    await choose('Alimentação', 'Desarquivar');
    expect(await screen.findByText('Categoria "Alimentação" desarquivada.')).toBeDefined();
    expect(screen.queryAllByText('Arquivada')).toHaveLength(0);
  });

  it('exclui a mãe com as filhas depois de confirmar', async () => {
    const { orm, transport } = await open();
    await choose('Alimentação', 'Excluir');
    const confirm = dialog();
    expect(confirm.textContent).toContain('Excluir "Alimentação"?');
    expect(confirm.textContent).toContain(
      '2 subcategorias serão excluídas junto: Mercado, Restaurantes.',
    );
    await userEvent.click(within(confirm).getByRole('button', { name: 'Cancelar' }));
    expect(topLevelNames()).toContain('Alimentação');

    await choose('Alimentação', 'Excluir');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Excluir categoria' }));
    expect(await screen.findByText('Categoria "Alimentação" excluída.')).toBeDefined();
    expect(topLevelNames()).toEqual(['Moradia', 'Lazer', 'Outros']);
    for (const deleted of [id(1), id(2), id(3)]) {
      expect((await row(orm, deleted))[0]?.deletedAt).not.toBeNull();
    }
    await waitFor(() =>
      expect(transport.pushed.map((m) => m.op)).toEqual(['delete', 'delete', 'delete']),
    );
  });

  it('exclusão sem filhas avisa que nenhuma vai junto', async () => {
    await open();
    await choose('Lazer', 'Excluir');
    expect(dialog().textContent).toContain('Nenhuma subcategoria será excluída junto.');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reordena pelo menu, pelas setas na alça e arrastando (RF-CAT-05)', async () => {
    const { orm } = await open();
    await choose('Alimentação', 'Mover para baixo');
    expect(await screen.findByText('Categoria "Alimentação" movida.')).toBeDefined();
    expect(topLevelNames()).toEqual(['Moradia', 'Alimentação', 'Lazer', 'Outros']);
    expect(
      within(await actions('Moradia')).queryByRole('menuitem', { name: 'Mover para cima' }),
    ).toBeNull();
    await userEvent.keyboard('{Escape}');

    const handle = screen.getByRole('button', { name: 'Arrastar Lazer para reordenar' });
    handle.focus();
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() =>
      expect(topLevelNames()).toEqual(['Moradia', 'Lazer', 'Alimentação', 'Outros']),
    );

    const target = screen.getByRole('button', { name: 'Arrastar Moradia para reordenar' });
    fireEvent.dragStart(
      screen.getByRole('button', { name: 'Arrastar Alimentação para reordenar' }),
      {
        dataTransfer: { setData: () => undefined, effectAllowed: 'move' },
      },
    );
    const targetRow = target.closest('[data-category-id]');
    if (!targetRow) {
      throw new Error('linha de Moradia ausente');
    }
    // jsdom não mede layout nem tem DragEvent: a linha ocupa 100..140 e o ponteiro vem no evento.
    vi.spyOn(targetRow, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 400, 40));
    const at = (event: Event, clientY: number): Event =>
      Object.defineProperty(event, 'clientY', { value: clientY });
    act(() => {
      fireEvent(targetRow, at(createEvent.dragOver(targetRow), 110));
    });
    expect(targetRow.getAttribute('data-drop')).toBe('before');
    act(() => {
      fireEvent(targetRow, at(createEvent.dragOver(targetRow), 130));
    });
    expect(targetRow.getAttribute('data-drop')).toBe('after');
    act(() => {
      fireEvent.dragLeave(targetRow);
    });
    expect(targetRow.getAttribute('data-drop')).toBeNull();
    await act(async () => {
      fireEvent(targetRow, at(createEvent.drop(targetRow), 105));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(topLevelNames()).toEqual(['Alimentação', 'Moradia', 'Lazer', 'Outros']),
    );
    expect((await row(orm, id(1)))[0]?.sortOrder).toBe(0);

    // Filhas reordenam entre si.
    await choose('Restaurantes', 'Mover para cima');
    await waitFor(() => expect(childNames('Alimentação')).toEqual(['Restaurantes', 'Mercado']));
  });

  it('aba sem categorias mostra o estado vazio', async () => {
    await open(SAMPLE.filter((c) => c.type !== 'income'));
    await userEvent.click(screen.getByRole('tab', { name: 'Receitas' }));
    expect(screen.getByText('Nenhuma categoria aqui ainda')).toBeDefined();
  });

  it('sem perfil sincronizado, pede a primeira sincronização', async () => {
    const orm = await seededDatabase([], { withProfile: false });
    renderApp('/categorias', { sync: { orm, userId: USER, transport: new FakeTransport() } });
    expect(await screen.findByText(/Aguardando a primeira sincronização/)).toBeDefined();
    expect(
      (screen.getByRole('button', { name: 'Nova categoria' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('sem banco local, explica que a tela não está disponível', async () => {
    const { container } = renderApp('/categorias');
    expect(screen.getByText('Sincronização indisponível')).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('sync na tela de categorias (F6, TD-020)', () => {
  it('offline: grava no aparelho, mostra pendências e envia ao voltar a rede', async () => {
    const transport = new FakeTransport();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    await open(SAMPLE, { transport });
    await choose('Lazer', 'Arquivar');
    expect(await screen.findByText('Offline · 1 alteração pendente')).toBeDefined();
    expect(transport.pushed).toHaveLength(0);

    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(await screen.findByText('Sincronizado')).toBeDefined();
    expect(transport.pushed).toHaveLength(1);
  });

  it('falha do servidor mantém a fila e avisa no indicador', async () => {
    const transport = new FakeTransport();
    const { orm } = await open(SAMPLE, { transport });
    await screen.findByText('Sincronizado');
    transport.failing = true;
    await choose('Lazer', 'Arquivar');
    expect(await screen.findByText('Falha ao sincronizar · tentaremos de novo')).toBeDefined();
    expect((await row(orm, id(5)))[0]?.archivedAt).not.toBeNull();
  });

  it('mutação recusada pelo servidor é desfeita e avisada até fechar o aviso', async () => {
    const transport = new FakeTransport();
    transport.reject = (mutation) => (mutation.fields['name'] === 'Recusada' ? 'invalid' : null);
    await open(SAMPLE, { transport });
    await userEvent.click(screen.getByRole('button', { name: 'Nova categoria' }));
    await userEvent.type(within(dialog()).getByLabelText('Nome'), 'Recusada');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('1 alteração foi recusada pelo servidor');
    await waitFor(() => expect(topLevelNames()).not.toContain('Recusada'));
    await userEvent.click(within(alert).getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
