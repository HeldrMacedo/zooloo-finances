import { money, type Money } from './money.js';

export class InvalidInstallmentCountError extends Error {
  override readonly name = 'InvalidInstallmentCountError';
}

/**
 * Divide o total em parcelas (RN-LAN-11): cada parcela recebe o valor truncado em centavos e o
 * resíduo vai para a 1ª, como fazem os bancos (RN-OF-08). A soma é sempre igual ao total.
 */
export function splitInstallments(total: Money, count: number): Money[] {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new InvalidInstallmentCountError(`Quantidade de parcelas inválida: ${count}.`);
  }
  const sign = total.cents < 0 ? -1 : 1;
  const absolute = Math.abs(total.cents);
  const base = Math.floor(absolute / count);
  const residue = absolute - base * count;
  return Array.from({ length: count }, (_, index) =>
    money(sign * (index === 0 ? base + residue : base), total.currency),
  );
}
