import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: LucideIcon;
  /** Botão só com ícone: o texto vira o nome acessível e o tooltip. */
  readonly iconOnly?: boolean;
  /** Ação em andamento: desabilita e anuncia ocupado, mantendo a largura. */
  readonly busy?: boolean;
  readonly children: ReactNode;
}

/**
 * Botão do design system (doc 13 §2.3 e §4). Primário em Teal-700 com texto branco (5,3:1); nunca
 * texto branco sobre Teal. `type="button"` por padrão para não enviar formulários sem querer.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconOnly = false,
  busy = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    iconOnly && styles.iconOnly,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled === true || busy}
      aria-busy={busy || undefined}
      title={iconOnly && typeof children === 'string' ? children : rest.title}
    >
      {Icon && <Icon aria-hidden="true" size={size === 'sm' ? 16 : 18} strokeWidth={2} />}
      {iconOnly ? <span className="visually-hidden">{children}</span> : <span>{children}</span>}
    </button>
  );
}
