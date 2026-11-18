import { t } from '@zooloo/i18n';
import { color } from '@zooloo/ui-tokens';
import styles from './ZoolooLogo.module.css';

/** Pontos do "Z" provisório, iguais aos de `scripts/provisional-mark.ts` (ícones do PWA). */
const Z_POINTS = '30,30 70,30 70,39 44,61 70,61 70,70 30,70 30,61 56,39 30,39';

export interface ZoolooLogoProps {
  /** `horizontal`: símbolo + "zooloo FINANÇAS"; `mark`: só o símbolo. */
  readonly variant?: 'horizontal' | 'mark';
  /** `negative` para fundo Midnight (topbar). */
  readonly tone?: 'default' | 'negative';
}

/**
 * Logotipo PROVISÓRIO (doc 13 §7.1): círculo Teal com "Z" Midnight no lugar da coruja e a palavra
 * em Plus Jakarta 800. Único ponto de troca quando os vetores definitivos chegarem; não vai para o
 * lançamento público.
 */
export function ZoolooLogo({ variant = 'horizontal', tone = 'default' }: ZoolooLogoProps) {
  const mark = (
    <svg className={styles.mark} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="50" fill={color.teal} />
      <polygon points={Z_POINTS} fill={color.midnight} />
    </svg>
  );
  if (variant === 'mark') {
    return (
      <span className={styles.logo} role="img" aria-label={t('app.name')}>
        {mark}
      </span>
    );
  }
  return (
    <span
      className={[styles.logo, tone === 'negative' && styles.negative].filter(Boolean).join(' ')}
      role="img"
      aria-label={t('app.name')}
    >
      {mark}
      <span className={styles.wordmark} aria-hidden="true">
        <span className={styles.word}>zooloo</span>
        <span className={styles.descriptor}>finanças</span>
      </span>
    </span>
  );
}
