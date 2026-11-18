import { addMoney, type Money, subtractMoney } from './money.js';
import { divideHalfEven } from './rounding.js';

export interface BudgetInput {
  readonly goal: Money;
  readonly effected: Money;
  readonly pending: Money;
  /** Opção "Previsto" (RN-ORC-08): soma também os pendentes do período. */
  readonly includePending: boolean;
}

export interface BudgetSummary {
  readonly goal: Money;
  readonly effected: Money;
  readonly pending: Money;
  readonly considered: Money;
  /** Saldo = meta − considerado; negativo em despesa é estouro (RN-ORC-06). */
  readonly remaining: Money;
  /** Percentual de uso em pontos-base (7500 = 75%); `null` quando a meta é zero. */
  readonly usageBasisPoints: number | null;
  readonly overspent: boolean;
}

const BASIS_POINTS = 10_000;

export function summarizeBudget(input: BudgetInput): BudgetSummary {
  const considered = input.includePending
    ? addMoney(input.effected, input.pending)
    : input.effected;
  const remaining = subtractMoney(input.goal, considered);
  return {
    goal: input.goal,
    effected: input.effected,
    pending: input.pending,
    considered,
    remaining,
    usageBasisPoints:
      input.goal.cents === 0
        ? null
        : divideHalfEven(considered.cents * BASIS_POINTS, input.goal.cents),
    overspent: remaining.cents < 0,
  };
}
