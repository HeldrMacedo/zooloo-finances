import {
  addDays,
  addMonths,
  compareLocalDate,
  type LocalDate,
  withDayClamped,
} from './local-date.js';

/** Regra de fechamento da fatura (RN-CRT-02). */
export type ClosingRule =
  | { readonly kind: 'days-before-due'; readonly days: number }
  | { readonly kind: 'fixed-day'; readonly day: number };

export interface CreditCardCycle {
  readonly dueDay: number;
  readonly closing: ClosingRule;
}

export class InvalidCardCycleError extends Error {
  override readonly name = 'InvalidCardCycleError';
}

const MAX_DAYS_BEFORE_DUE = 28;

function isDayOfMonth(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 31;
}

function assertValidCycle(card: CreditCardCycle): void {
  const closingValid =
    card.closing.kind === 'days-before-due'
      ? Number.isInteger(card.closing.days) &&
        card.closing.days >= 1 &&
        card.closing.days <= MAX_DAYS_BEFORE_DUE
      : isDayOfMonth(card.closing.day);
  if (!isDayOfMonth(card.dueDay) || !closingValid) {
    throw new InvalidCardCycleError(`Ciclo de cartão inválido: ${JSON.stringify(card)}.`);
  }
}

/** Data de fechamento da fatura que vence em `dueDate`. */
export function closingDateForDueDate(dueDate: LocalDate, card: CreditCardCycle): LocalDate {
  assertValidCycle(card);
  if (card.closing.kind === 'days-before-due') {
    return addDays(dueDate, -card.closing.days);
  }
  const closingMonth = card.closing.day < card.dueDay ? dueDate : addMonths(dueDate, -1);
  return withDayClamped(closingMonth.year, closingMonth.month, card.closing.day);
}

/**
 * Vencimento da fatura em que a compra entra (RN-CRT-03): a primeira fatura cujo fechamento é no
 * dia da compra ou depois. A compra no próprio dia do fechamento entra na fatura que fecha nele.
 */
export function invoiceDueDateForPurchase(purchase: LocalDate, card: CreditCardCycle): LocalDate {
  assertValidCycle(card);
  for (let offset = -1; ; offset += 1) {
    const month = addMonths(withDayClamped(purchase.year, purchase.month, 1), offset);
    const dueDate = withDayClamped(month.year, month.month, card.dueDay);
    if (compareLocalDate(closingDateForDueDate(dueDate, card), purchase) >= 0) {
      return dueDate;
    }
  }
}
