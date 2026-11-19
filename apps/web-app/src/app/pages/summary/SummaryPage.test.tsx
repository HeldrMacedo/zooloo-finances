import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations, renderApp } from '../../../testing/render.js';

describe('Resumo (dados sintéticos)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // Sem fuso: hora local, como o relógio do dispositivo.
    vi.setSystemTime('2026-11-19T09:00:00');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra KPIs, avisa que os dados são de exemplo e saúda pela hora', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Resumo' })).toBeDefined();
    expect(screen.getByText(/Dados de exemplo/)).toBeDefined();
    expect(screen.getByText('Bom dia!')).toBeDefined();
    expect(screen.getByText('Resumo financeiro de novembro de 2026')).toBeDefined();
    const kpis = screen.getByRole('region', { name: 'Indicadores do mês' });
    expect(within(kpis).getByRole('heading', { name: 'Receitas do mês' })).toBeDefined();
    // Novembro: 7.400 + 2.450 de receitas.
    expect(within(kpis).getByText(/^R\$\s9\.850,00$/)).toBeDefined();
    expect(within(kpis).getByText('2 entradas')).toBeDefined();
    expect(screen.getByText('72% do orçamento usado')).toBeDefined();
  });

  it('navega entre meses pelo cabeçalho', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('Resumo financeiro de dezembro de 2026')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('Resumo financeiro de outubro de 2026')).toBeDefined();
  });

  it('filtra movimentações por receita e despesa', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderApp('/');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    await user.click(screen.getByRole('button', { name: 'Receitas' }));
    expect(screen.getByRole('button', { name: 'Receitas' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Despesas' }));
    expect(within(table).getAllByRole('row')).toHaveLength(6);
  });

  it('marca um vencimento como pago', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderApp('/');
    const bills = screen.getByRole('region', { name: 'Próximos vencimentos' });
    expect(within(bills).queryByText('Pago')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Pagar Energia Cosern' }));
    expect(within(bills).getByText('Pago')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Pagar Energia Cosern' })).toBeNull();
  });

  it('modo privado oculta os valores do painel', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const { container } = renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    expect(container.textContent).not.toContain('9.850,00');
  });

  it('sem violações de acessibilidade (axe)', async () => {
    const { container } = renderApp('/');
    expect(await axeViolations(container)).toEqual([]);
  });
});
