import type { Money } from '@zooloo/domain';
import { formatMoney, moneyParts, t } from '@zooloo/i18n';
import { usePrivacy } from '../privacy/PrivacyContext.js';
import styles from './Amount.module.css';

export type AmountSize = 'xs' | 'sm' | 'md' | 'lg' | 'display';

export interface AmountProps {
  readonly value: Money;
  readonly size?: AmountSize;
  /**
   * `signed`: valor de lançamento, sempre com sinal e cor de entrada/saída (RNF-UX-02).
   * `balance`: saldo; só negativo ganha cor e sinal.
   */
  readonly kind?: 'signed' | 'balance';
}

/**
 * Valor monetário. O número é o protagonista: Plus Jakarta com algarismos tabulares, símbolo da
 * moeda menor e alinhado ao topo. Respeita o modo privado (RNF-UX-03) e nunca depende só da cor:
 * o sinal está no texto e o nome acessível diz "entrada"/"saída".
 */
export function Amount({ value, size = 'md', kind = 'balance' }: AmountProps) {
  const { hidden } = usePrivacy();
  const signed = kind === 'signed';
  const parts = moneyParts(value, { sign: signed ? 'always' : 'auto', hidden });
  const direction = value.cents > 0 && signed ? 'income' : value.cents < 0 ? 'expense' : 'neutral';
  const label = hidden
    ? t('privacy.hiddenValue')
    : direction === 'neutral'
      ? formatMoney(value)
      : `${formatMoney(value, { sign: signed ? 'always' : 'auto' })}, ${t(`amount.${direction}`)}`;
  return (
    <span
      className={[styles.amount, styles[size], styles[direction]].join(' ')}
      data-hidden={hidden || undefined}
    >
      <span className="visually-hidden">{label}</span>
      {parts.sign && (
        <span className={styles.sign} aria-hidden="true">
          {parts.sign === '-' ? '−' : '+'}
        </span>
      )}
      <span className={styles.currency} aria-hidden="true">
        {parts.currency}
      </span>
      <span className={styles.number} aria-hidden="true">
        {parts.amount}
      </span>
    </span>
  );
}
