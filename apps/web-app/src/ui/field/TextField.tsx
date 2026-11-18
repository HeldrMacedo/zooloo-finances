import { type InputHTMLAttributes, type Ref, useId } from 'react';
import styles from './TextField.module.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  readonly label: string;
  /** Orientação curta, sempre visível (não depende de placeholder). */
  readonly hint?: string;
  /** Mensagem que explica o problema e como corrigir. */
  readonly error?: string;
  /** Rótulo só para leitor de tela, quando o contexto visual já basta (ex.: busca na topbar). */
  readonly hideLabel?: boolean;
  readonly ref?: Ref<HTMLInputElement>;
}

/** Campo de texto com rótulo, dica e erro ligados por `aria-describedby` (RNF-UX-01). */
export function TextField({
  label,
  hint,
  error,
  hideLabel = false,
  className,
  ref,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </label>
      <input
        {...rest}
        ref={ref}
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
