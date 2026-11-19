import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axeViolations, renderApp } from '../testing/render.js';

describe('app shell (doc 13 §5.1, doc 06 §2)', () => {
  it('tem marca, busca, menu principal e conteúdo com link para pular o menu', () => {
    renderApp('/');
    expect(screen.getByRole('img', { name: 'Zooloo Finanças' })).toBeDefined();
    expect(screen.getByRole('searchbox', { name: 'Buscar lançamentos' })).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' }).getAttribute('href')).toBe(
      '#conteudo',
    );
    expect(screen.getByRole('main')).toBeDefined();
  });

  it('marca o item ativo do menu e navega', async () => {
    renderApp('/');
    expect(screen.getByRole('link', { name: 'Resumo' }).getAttribute('aria-current')).toBe('page');
    await userEvent.click(screen.getByRole('link', { name: 'Contas' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Contas' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Contas' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Resumo' }).getAttribute('aria-current')).toBeNull();
  });

  it('telas ainda não construídas dizem isso, sem dados falsos', () => {
    renderApp('/orcamentos');
    expect(screen.getByRole('heading', { level: 1, name: 'Orçamentos' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Em construção' })).toBeDefined();
  });

  it('endereço desconhecido mostra "Página não encontrada" com saída para o Resumo', async () => {
    renderApp('/nao-existe');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeDefined();
    await userEvent.click(screen.getByRole('link', { name: 'Ir para o Resumo' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Resumo' })).toBeDefined();
  });

  it('vitrine do design system só existe quando habilitada (desenvolvimento)', () => {
    renderApp('/design');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeDefined();
  });

  it('vitrine habilitada renderiza sem violações de acessibilidade', async () => {
    const { container } = renderApp('/design', { withDesignSystem: true });
    expect(screen.getByRole('heading', { level: 1, name: 'Design system' })).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('shell sem violações de acessibilidade (axe)', async () => {
    const { container } = renderApp('/');
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('atalhos de teclado (RNF-UX-05)', () => {
  it('"/" foca a busca', async () => {
    renderApp('/');
    await userEvent.keyboard('/');
    expect(document.activeElement).toBe(screen.getByRole('searchbox'));
  });

  it('"N" abre nova despesa; digitar "n" num campo não dispara', async () => {
    const { router } = renderApp('/contas');
    const search = screen.getByRole('searchbox');
    await userEvent.type(search, 'n');
    expect(router.state.location.pathname).toBe('/contas');
    search.blur();
    await userEvent.keyboard('N');
    expect(router.state.location.pathname).toBe('/transacoes');
    expect(router.state.location.search).toBe('?novo=despesa');
  });

  it('atalho com Ctrl é ignorado', async () => {
    const { router } = renderApp('/contas');
    await userEvent.keyboard('{Control>}n{/Control}');
    expect(router.state.location.pathname).toBe('/contas');
  });

  it('botão "Nova despesa" da topbar leva ao mesmo lugar', async () => {
    const { router } = renderApp('/');
    await userEvent.click(screen.getByRole('button', { name: 'Nova despesa' }));
    expect(router.state.location.search).toBe('?novo=despesa');
  });
});

describe('preferências da topbar', () => {
  it('tema alterna automático → claro → escuro → automático e é lembrado', async () => {
    renderApp('/');
    const html = document.documentElement;
    await userEvent.click(screen.getByRole('button', { name: /Tema: Automático/ }));
    expect(html.dataset['theme']).toBe('light');
    expect(localStorage.getItem('zl-theme')).toBe('light');
    await userEvent.click(screen.getByRole('button', { name: /Tema: Claro/ }));
    expect(html.dataset['theme']).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: /Tema: Escuro/ }));
    expect(html.dataset['theme']).toBeUndefined();
    expect(localStorage.getItem('zl-theme')).toBeNull();
  });

  it('tema salvo é restaurado na abertura', () => {
    localStorage.setItem('zl-theme', 'dark');
    renderApp('/');
    expect(screen.getByRole('button', { name: /Tema: Escuro/ })).toBeDefined();
  });

  it('modo privado alterna pelo botão do olho', async () => {
    renderApp('/');
    const button = screen.getByRole('button', { name: 'Ocultar valores' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(button);
    expect(
      screen.getByRole('button', { name: 'Mostrar valores' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('indicador de sync mostra offline e volta ao ficar online (F6)', () => {
    renderApp('/');
    expect(screen.getByRole('status').textContent).toBe('Sincronizado');
    const online = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status').textContent).toBe('Offline · nenhuma alteração pendente');
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('status').textContent).toBe('Sincronizado');
    if (online) {
      Object.defineProperty(Navigator.prototype, 'onLine', online);
    }
    Reflect.deleteProperty(navigator, 'onLine');
  });
});

describe('menu lateral (doc 13 §5.1)', () => {
  it('no desktop, o botão de menu recolhe para trilho de ícones e é lembrado', async () => {
    renderApp('/');
    const toggle = screen.getByRole('button', { name: 'Recolher ou expandir menu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await userEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(localStorage.getItem('zl-sidebar-collapsed')).toBe('1');
    // Recolhido, os itens seguem acessíveis pelo nome.
    expect(screen.getByRole('link', { name: 'Contas' })).toBeDefined();
    await userEvent.click(toggle);
    expect(localStorage.getItem('zl-sidebar-collapsed')).toBe('0');
  });

  it('em telas menores vira gaveta: abre pelo botão, fecha com Esc, botão X ou ao navegar', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((media: string) => ({
      matches: false,
      media,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
    try {
      renderApp('/');
      const toggle = screen.getByRole('button', { name: 'Recolher ou expandir menu' });
      // Gaveta fechada fica fora da ordem de foco.
      const drawer = screen.getByRole('navigation', { name: 'Menu principal' }).closest('aside');
      expect(drawer?.hasAttribute('inert')).toBe(true);

      await userEvent.click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(drawer?.hasAttribute('inert')).toBe(false);
      await userEvent.keyboard('{Escape}');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');

      await userEvent.click(toggle);
      await userEvent.click(screen.getByRole('button', { name: 'Fechar menu' }));
      expect(toggle.getAttribute('aria-expanded')).toBe('false');

      await userEvent.click(toggle);
      await userEvent.click(screen.getByRole('link', { name: 'Contas' }));
      expect(screen.getByRole('heading', { level: 1, name: 'Contas' })).toBeDefined();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    } finally {
      window.matchMedia = original;
    }
  });
});
