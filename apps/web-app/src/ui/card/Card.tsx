import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Título do card; vira o nome acessível da região. */
  readonly title?: string;
  /** Ação no canto do cabeçalho (ex.: "Ver todos"). */
  readonly action?: ReactNode;
  /** `highlight` usa fundo Mint para o card principal da tela; os demais ficam brancos. */
  readonly tone?: 'plain' | 'highlight';
  readonly children: ReactNode;
}

/** Card de conteúdo (doc 13 §4: raio 16 px, sombra leve). Um destaque por tela, no máximo. */
export function Card({ title, action, tone = 'plain', className, children, ...rest }: CardProps) {
  const classes = [styles.card, tone === 'highlight' && styles.highlight, className]
    .filter(Boolean)
    .join(' ');
  return (
    <section {...rest} className={classes} aria-label={title}>
      {(title ?? action) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
