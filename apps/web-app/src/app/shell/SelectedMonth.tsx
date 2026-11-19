import { addMonths, type LocalDate, localDate } from '@zooloo/domain';
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react';
import { todayLocal } from '../../data/clock.js';

interface SelectedMonthState {
  /** Primeiro dia do mês em exibição. */
  readonly month: LocalDate;
  previous(): void;
  next(): void;
}

const firstDay = (date: LocalDate): LocalDate => localDate(date.year, date.month, 1);

const SelectedMonthContext = createContext<SelectedMonthState>({
  month: localDate(2026, 1, 1),
  previous: () => undefined,
  next: () => undefined,
});

/** Mês em exibição no cabeçalho, compartilhado pelas telas de período (Resumo, Transações…). */
export function SelectedMonthProvider({
  initial,
  children,
}: {
  readonly initial?: LocalDate;
  readonly children: ReactNode;
}) {
  const [month, setMonth] = useState(() => firstDay(initial ?? todayLocal()));
  const previous = useCallback(() => setMonth((current) => addMonths(current, -1)), []);
  const next = useCallback(() => setMonth((current) => addMonths(current, 1)), []);
  const value = useMemo(() => ({ month, previous, next }), [month, previous, next]);
  return <SelectedMonthContext value={value}>{children}</SelectedMonthContext>;
}

export function useSelectedMonth(): SelectedMonthState {
  return use(SelectedMonthContext);
}
