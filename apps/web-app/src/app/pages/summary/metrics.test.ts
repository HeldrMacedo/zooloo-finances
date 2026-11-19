import { localDate, money } from '@zooloo/domain';
import { describe, expect, it } from 'vitest';
import { type SummaryData, type SummaryTransaction, summaryFixture } from './fixture.js';
import { summaryMetrics } from './metrics.js';

const brl = (cents: number) => money(cents, 'BRL');

function tx(
  kind: SummaryTransaction['kind'],
  category: string,
  cents: number,
  settled = true,
): SummaryTransaction {
  return {
    id: `${kind}-${category}-${cents}`,
    date: localDate(2026, 11, 1),
    description: category,
    category,
    account: 'Conta',
    kind,
    settled,
    amount: brl(cents),
  };
}

function data(transactions: SummaryTransaction[], budgetCap = 100_000): SummaryData {
  return {
    openingBalance: brl(50_000),
    budgetCap: brl(budgetCap),
    openInvoices: brl(0),
    invoiceDue: localDate(2026, 11, 28),
    weeks: [],
    bills: [],
    transactions,
  };
}

describe('summaryMetrics', () => {
  it('soma receitas e despesas em centavos e calcula balanço e saldo consolidado', () => {
    const metrics = summaryMetrics(
      data([tx('income', 'Salário', 300_000), tx('expense', 'Moradia', 120_000)]),
    );
    expect(metrics.income).toEqual(brl(300_000));
    expect(metrics.expense).toEqual(brl(120_000));
    expect(metrics.balance).toEqual(brl(180_000));
    expect(metrics.consolidated).toEqual(brl(230_000));
    expect(metrics.savingsPercent).toBe(60);
    expect([metrics.incomeCount, metrics.expenseCount]).toEqual([1, 1]);
  });

  it('agrupa despesas por categoria, da maior para a menor, com % inteiro', () => {
    const metrics = summaryMetrics(
      data([
        tx('expense', 'Lazer', 10_000),
        tx('expense', 'Moradia', 20_000),
        tx('expense', 'Lazer', 10_000),
        tx('expense', 'Transporte', 10_000),
        tx('income', 'Salário', 99_999),
      ]),
    );
    expect(
      metrics.byCategory.map((share) => [share.category, share.total.cents, share.percent]),
    ).toEqual([
      ['Lazer', 20_000, 40],
      ['Moradia', 20_000, 40],
      ['Transporte', 10_000, 20],
    ]);
  });

  it('gasto acima da receita dá sobra negativa; sem receita, 0%', () => {
    expect(
      summaryMetrics(data([tx('income', 'Salário', 100_000), tx('expense', 'Lazer', 150_000)]))
        .savingsPercent,
    ).toBe(-50);
    expect(summaryMetrics(data([tx('expense', 'Lazer', 1_000)])).savingsPercent).toBe(0);
  });

  it('orçamento considera pendentes e marca dentro, perto e acima do teto', () => {
    const within = summaryMetrics(data([tx('expense', 'Lazer', 50_000)]));
    expect([within.budgetPercent, within.budgetStatus]).toEqual([50, 'within']);

    const near = summaryMetrics(
      data([tx('expense', 'Lazer', 50_000), tx('expense', 'Lazer', 40_000, false)]),
    );
    expect(near.budget.considered).toEqual(brl(90_000));
    expect([near.budgetPercent, near.budgetStatus]).toEqual([90, 'near']);

    const over = summaryMetrics(data([tx('expense', 'Lazer', 120_000)]));
    expect([over.budgetPercent, over.budgetStatus]).toEqual([120, 'over']);
  });

  it('sem teto, uso do orçamento fica em 0%', () => {
    expect(summaryMetrics(data([tx('expense', 'Lazer', 1_000)], 0)).budgetPercent).toBe(0);
  });
});

describe('summaryFixture', () => {
  it('gera datas dentro do mês pedido e alterna variações entre meses', () => {
    const november = summaryFixture(localDate(2026, 11, 1));
    const december = summaryFixture(localDate(2026, 12, 1));
    for (const tx of november.transactions) {
      expect([tx.date.year, tx.date.month]).toEqual([2026, 11]);
    }
    expect(november.invoiceDue).toEqual(localDate(2026, 11, 28));
    expect(november.openingBalance).not.toEqual(december.openingBalance);
    expect(summaryFixture(localDate(2027, 2, 1)).invoiceDue).toEqual(localDate(2027, 2, 28));
  });
});
