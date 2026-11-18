import type { Money } from '@zooloo/domain';
import { type FormatMoneyOptions, formatMoney } from './money-format.js';

export interface MoneyParts {
  /** `-`, `+` ou vazio. */
  readonly sign: '' | '+' | '-';
  /** Símbolo da moeda no locale (`R$`, `US$`). */
  readonly currency: string;
  /** Número formatado (`1.234,56`) ou `••••` no modo privado. */
  readonly amount: string;
}

const LEADING = /^([+-]?)(\D*?)\s*(\d.*|•+)$/u;

/**
 * Partes de `formatMoney` para a UI compor o valor (símbolo menor, número em destaque) sem
 * reimplementar a formatação. As partes reconstroem exatamente o texto de `formatMoney`.
 */
export function moneyParts(value: Money, options: FormatMoneyOptions = {}): MoneyParts {
  const text = formatMoney(value, options);
  // formatMoney sempre produz [sinal][símbolo][espaço][número]; o teste de propriedade garante.
  const [, sign = '', currency = '', amount = text] = LEADING.exec(text) ?? [];
  return { sign: sign as MoneyParts['sign'], currency, amount };
}
