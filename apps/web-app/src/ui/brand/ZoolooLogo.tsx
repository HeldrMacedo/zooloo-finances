import { t } from '@zooloo/i18n';
import { color } from '@zooloo/ui-tokens';
import styles from './ZoolooLogo.module.css';

export interface ZoolooLogoProps {
  /** `horizontal`: símbolo + "Zooloo Finanças"; `mark`: só o símbolo. */
  readonly variant?: 'horizontal' | 'mark';
  /** Linha de apoio abaixo do nome (ex.: "Controle inteligente" no menu). */
  readonly tagline?: string;
}

/**
 * Logotipo PROVISÓRIO (doc 13 §7.1): coruja geométrica do painel de referência num quadrado
 * Midnight e o nome em Plus Jakarta. Único ponto de troca quando os vetores definitivos chegarem;
 * não vai para o lançamento público.
 */
export function ZoolooLogo({ variant = 'horizontal', tagline }: ZoolooLogoProps) {
  const mark = (
    <span className={styles.badge} aria-hidden="true">
      <svg className={styles.mark} viewBox="0 0 36 36" focusable="false">
        <path
          d="M9 9L13.5 12.5C14.9 11.9 16.4 11.6 18 11.6C19.6 11.6 21.1 11.9 22.5 12.5L27 9L25.8 16.2C26.6 17.6 27 19.3 27 21C27 26 23 30 18 30C13 30 9 26 9 21C9 19.3 9.4 17.6 10.2 16.2L9 9Z"
          fill={color.teal}
          stroke={color['teal-300']}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="14.2" cy="19.5" r="3.3" fill={color.sand} />
        <circle cx="21.8" cy="19.5" r="3.3" fill={color.sand} />
        <circle cx="14.5" cy="19.5" r="1.4" fill={color.midnight} />
        <circle cx="21.5" cy="19.5" r="1.4" fill={color.midnight} />
        <path d="M16.5 22.6L18 25.1L19.5 22.6H16.5Z" fill={color.sun} />
      </svg>
    </span>
  );
  if (variant === 'mark') {
    return (
      <span className={styles.logo} role="img" aria-label={t('app.name')}>
        {mark}
      </span>
    );
  }
  return (
    <span className={styles.logo} role="img" aria-label={t('app.name')}>
      {mark}
      <span className={styles.wordmark} aria-hidden="true">
        <span className={styles.word}>
          Zooloo <span className={styles.descriptor}>Finanças</span>
        </span>
        {tagline && <span className={styles.tagline}>{tagline}</span>}
      </span>
    </span>
  );
}
