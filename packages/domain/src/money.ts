/**
 * Valor monetário em centavos inteiros + código ISO 4217 (RNF-FIN-01).
 * Nunca usar `number` solto ou float para dinheiro: sempre `Money`.
 */
export interface Money {
  readonly cents: number;
  readonly currency: string;
}

export class InvalidMoneyError extends Error {
  override readonly name = 'InvalidMoneyError';
}

export class CurrencyMismatchError extends Error {
  override readonly name = 'CurrencyMismatchError';
}

const CURRENCY_CODE = /^[A-Z]{3}$/;

export function money(cents: number, currency: string): Money {
  if (!Number.isSafeInteger(cents)) {
    throw new InvalidMoneyError(`Centavos precisam ser inteiro seguro; recebido ${cents}.`);
  }
  if (!CURRENCY_CODE.test(currency)) {
    throw new InvalidMoneyError(`Moeda precisa ser código ISO 4217; recebido "${currency}".`);
  }
  return { cents: cents === 0 ? 0 : cents, currency };
}

export function zeroMoney(currency: string): Money {
  return money(0, currency);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(`Moedas diferentes: ${a.currency} e ${b.currency}.`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.cents + b.cents, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.cents - b.cents, a.currency);
}

export function negateMoney(value: Money): Money {
  return money(-value.cents, value.currency);
}

export function sumMoney(values: readonly Money[], currency: string): Money {
  return values.reduce(addMoney, zeroMoney(currency));
}

export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  return a.cents < b.cents ? -1 : a.cents > b.cents ? 1 : 0;
}

export function isZero(value: Money): boolean {
  return value.cents === 0;
}

export function isNegative(value: Money): boolean {
  return value.cents < 0;
}
