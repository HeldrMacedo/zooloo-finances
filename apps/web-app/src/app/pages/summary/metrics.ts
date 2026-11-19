import {
  addMoney,
  type BudgetSummary,
  divideHalfEven,
  type Money,
  subtractMoney,
  sumMoney,
  summarizeBudget,
} from '@zooloo/domain';
import type { SummaryData, SummaryTransaction } from './fixture.js';

export interface CategoryShare {
  readonly category: string;
  readonly total: Money;
  /** Percentual inteiro do total de despesas. */
  readonly percent: number;
}

export type BudgetStatus = 'within' | 'near' | 'over';

export interface SummaryMetrics {
  readonly income: Money;
  readonly expense: Money;
  readonly balance: Money;
  readonly consolidated: Money;
  readonly incomeCount: number;
  readonly expenseCount: number;
  /** Sobra do mês em % da receita (negativo quando gastou mais do que entrou). */
  readonly savingsPercent: number;
  readonly byCategory: readonly CategoryShare[];
  readonly budget: BudgetSummary;
  /** Uso do teto em % inteiro; 0 quando não há teto. */
  readonly budgetPercent: number;
  readonly budgetStatus: BudgetStatus;
}

const CURRENCY = 'BRL';
/** A partir deste uso do teto o orçamento fica em alerta. */
const NEAR_LIMIT_PERCENT = 85;

const amounts = (items: readonly SummaryTransaction[]): Money[] => items.map((tx) => tx.amount);

const percentOf = (part: Money, whole: Money): number =>
  whole.cents === 0 ? 0 : divideHalfEven(part.cents * 100, whole.cents);

function sharesByCategory(expenses: readonly SummaryTransaction[], total: Money): CategoryShare[] {
  const totals = new Map<string, Money>();
  for (const tx of expenses) {
    const current = totals.get(tx.category);
    totals.set(tx.category, current ? addMoney(current, tx.amount) : tx.amount);
  }
  return [...totals]
    .map(([category, value]) => ({ category, total: value, percent: percentOf(value, total) }))
    .sort((a, b) => b.total.cents - a.total.cents);
}

/** Indicadores do Resumo calculados em centavos inteiros (RNF-FIN-01). */
export function summaryMetrics(data: SummaryData): SummaryMetrics {
  const incomes = data.transactions.filter((tx) => tx.kind === 'income');
  const expenses = data.transactions.filter((tx) => tx.kind === 'expense');
  const income = sumMoney(amounts(incomes), CURRENCY);
  const expense = sumMoney(amounts(expenses), CURRENCY);
  const balance = subtractMoney(income, expense);
  const budget = summarizeBudget({
    goal: data.budgetCap,
    effected: sumMoney(amounts(expenses.filter((tx) => tx.settled)), CURRENCY),
    pending: sumMoney(amounts(expenses.filter((tx) => !tx.settled)), CURRENCY),
    includePending: true,
  });
  const budgetPercent =
    budget.usageBasisPoints === null ? 0 : divideHalfEven(budget.usageBasisPoints, 100);
  return {
    income,
    expense,
    balance,
    consolidated: addMoney(data.openingBalance, balance),
    incomeCount: incomes.length,
    expenseCount: expenses.length,
    savingsPercent: percentOf(balance, income),
    byCategory: sharesByCategory(expenses, expense),
    budget,
    budgetPercent,
    budgetStatus: budget.overspent
      ? 'over'
      : budgetPercent >= NEAR_LIMIT_PERCENT
        ? 'near'
        : 'within',
  };
}
