import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { summarizeBudget } from './budget.js';
import { money } from './money.js';

describe('summarizeBudget (RN-ORC-06, RN-ORC-08)', () => {
  it('F5: meta 800, efetivado 500, pendente 100 com Previsto ligado', () => {
    const summary = summarizeBudget({
      goal: money(80_000, 'BRL'),
      effected: money(50_000, 'BRL'),
      pending: money(10_000, 'BRL'),
      includePending: true,
    });
    expect(summary).toEqual({
      goal: money(80_000, 'BRL'),
      effected: money(50_000, 'BRL'),
      pending: money(10_000, 'BRL'),
      considered: money(60_000, 'BRL'),
      remaining: money(20_000, 'BRL'),
      usageBasisPoints: 7_500,
      overspent: false,
    });
  });

  it('com Previsto desligado considera só o efetivado', () => {
    const summary = summarizeBudget({
      goal: money(80_000, 'BRL'),
      effected: money(50_000, 'BRL'),
      pending: money(10_000, 'BRL'),
      includePending: false,
    });
    expect(summary.considered).toEqual(money(50_000, 'BRL'));
    expect(summary.remaining).toEqual(money(30_000, 'BRL'));
    expect(summary.usageBasisPoints).toBe(6_250);
  });

  it('saldo negativo indica estouro', () => {
    const summary = summarizeBudget({
      goal: money(10_000, 'BRL'),
      effected: money(12_000, 'BRL'),
      pending: money(0, 'BRL'),
      includePending: true,
    });
    expect(summary.remaining).toEqual(money(-2_000, 'BRL'));
    expect(summary.overspent).toBe(true);
    expect(summary.usageBasisPoints).toBe(12_000);
  });

  it('meta zero não divide por zero', () => {
    const summary = summarizeBudget({
      goal: money(0, 'BRL'),
      effected: money(100, 'BRL'),
      pending: money(0, 'BRL'),
      includePending: true,
    });
    expect(summary.usageBasisPoints).toBeNull();
    expect(summary.overspent).toBe(true);
  });

  it('arredonda o percentual com half-even (RNF-FIN-04)', () => {
    const at = (effected: number, goal: number): number | null =>
      summarizeBudget({
        goal: money(goal, 'BRL'),
        effected: money(effected, 'BRL'),
        pending: money(0, 'BRL'),
        includePending: false,
      }).usageBasisPoints;
    // 1/3 = 3333,33… → 3333; 2/3 = 6666,66… → 6667
    expect(at(1, 3)).toBe(3_333);
    expect(at(2, 3)).toBe(6_667);
    // 1/20000 = 0,5 bp → 0 (par); 3/20000 = 1,5 bp → 2 (par)
    expect(at(1, 20_000)).toBe(0);
    expect(at(3, 20_000)).toBe(2);
  });

  it('propriedade: saldo + considerado = meta', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000_000 }),
        fc.integer({ min: 0, max: 100_000_000 }),
        fc.integer({ min: 0, max: 100_000_000 }),
        fc.boolean(),
        (goal, effected, pending, includePending) => {
          const summary = summarizeBudget({
            goal: money(goal, 'BRL'),
            effected: money(effected, 'BRL'),
            pending: money(pending, 'BRL'),
            includePending,
          });
          expect(summary.remaining.cents + summary.considered.cents).toBe(goal);
          expect(summary.overspent).toBe(summary.considered.cents > goal);
        },
      ),
    );
  });
});
