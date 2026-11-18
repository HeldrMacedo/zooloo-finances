import { money, type Money } from '@zooloo/domain';

export const LOCALE = 'pt-BR';

export class InvalidMoneyInputError extends Error {
  override readonly name = 'InvalidMoneyInputError';
}

export interface FormatMoneyOptions {
  /** `always` mostra `+` em valores positivos (RNF-UX-02). Zero nunca leva sinal. */
  readonly sign?: 'auto' | 'always';
  /** Modo privado (RNF-UX-03): mantém o símbolo da moeda e oculta o valor. */
  readonly hidden?: boolean;
}

const HIDDEN_VALUE = '••••';
const NUMERIC_PARTS = new Set(['integer', 'group', 'decimal', 'fraction']);

function currencyFormatter(currency: string, sign: 'auto' | 'always'): Intl.NumberFormat {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    signDisplay: sign === 'always' ? 'exceptZero' : 'auto',
  });
}

/** Casas decimais da moeda (BRL = 2, JPY = 0): os centavos de `Money` são unidades menores. */
function minorDigits(currency: string): number {
  const { maximumFractionDigits = 2 } = currencyFormatter(currency, 'auto').resolvedOptions();
  return maximumFractionDigits;
}

/** Decimal exato em texto a partir dos centavos, sem passar por float (RNF-FIN-01). */
function toDecimalString(value: Money, digits: number): `${number}` {
  const absolute = String(Math.abs(value.cents)).padStart(digits + 1, '0');
  const sign = value.cents < 0 ? '-' : '';
  const decimal =
    digits === 0 ? absolute : `${absolute.slice(0, -digits)}.${absolute.slice(-digits)}`;
  return `${sign}${decimal}` as `${number}`;
}

export function formatMoney(value: Money, options: FormatMoneyOptions = {}): string {
  const formatter = currencyFormatter(value.currency, options.sign ?? 'auto');
  if (options.hidden) {
    const parts = formatter.formatToParts(0).filter((part) => !NUMERIC_PARTS.has(part.type));
    return `${parts.map((part) => part.value).join('')}${HIDDEN_VALUE}`;
  }
  return formatter.format(toDecimalString(value, minorDigits(value.currency)));
}

// Regexes fixas, sem quantificador aninhado, e entrada limitada (SEC-DEV-02).
const CURRENCY_PREFIX = /^[+-]?[A-Z]{0,3}[$¥€£]?/;
const DIGITS = /^\d*$/;

/** Parte inteira em pt-BR: `1234` ou com milhar `1.234.567`. Devolve só os dígitos. */
function integerDigits(text: string): string | null {
  const groups = text.split('.');
  const [head = '', ...tail] = groups;
  const grouped =
    tail.length === 0 ||
    (head.length >= 1 && head.length <= 3 && tail.every((g) => g.length === 3));
  const digits = groups.join('');
  return grouped && DIGITS.test(digits) ? digits : null;
}

/** Separa `1.234,56` em dígitos inteiros e fracionários; `null` se o formato não for pt-BR. */
function splitAmount(text: string): { integer: string; fraction: string } | null {
  const [integerText = '', fraction, ...extra] = text.split(',');
  const integer = integerDigits(integerText);
  const fractionValid = fraction === undefined || (fraction !== '' && DIGITS.test(fraction));
  if (integer === null || extra.length > 0 || !fractionValid) {
    return null;
  }
  return { integer, fraction: fraction ?? '' };
}
const MAX_INPUT_LENGTH = 40;

/**
 * Lê o valor digitado no formulário (formato pt-BR: `1.234,56`) e devolve `Money`.
 * Aceita símbolo da moeda e espaços; recusa formatos ambíguos como `12.34` ou `1,234`.
 */
export function parseMoneyInput(input: string, currency: string): Money {
  const digits = minorDigits(currency);
  const compact = input.replace(/\s/g, '');
  const sign = compact.startsWith('-') ? '-' : '';
  const number = compact.replace(CURRENCY_PREFIX, '');
  const amount = compact.length <= MAX_INPUT_LENGTH ? splitAmount(number) : null;
  const integerPart = amount?.integer ?? '';
  const fractionPart = amount?.fraction ?? '';
  if (
    !amount ||
    (integerPart === '' && fractionPart === '') ||
    fractionPart.length > digits ||
    (digits === 0 && number.includes(','))
  ) {
    throw new InvalidMoneyInputError(`Valor inválido: "${input}".`);
  }
  const cents = Number(`${sign}${integerPart || '0'}${fractionPart.padEnd(digits, '0')}`);
  if (!Number.isSafeInteger(cents)) {
    throw new InvalidMoneyInputError(`Valor fora do limite: "${input}".`);
  }
  return money(cents, currency);
}
