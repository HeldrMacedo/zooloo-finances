import { type InputHTMLAttributes, useId } from 'react';
import styles from './SwitchField.module.css';

export interface SwitchFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'type' | 'role'
> {
  readonly label: string;
}

/** Alternância liga/desliga: checkbox nativo com papel `switch` e rótulo clicável. */
export function SwitchField({ label, className, ...rest }: SwitchFieldProps) {
  const id = useId();
  return (
    <div className={[styles.switch, className].filter(Boolean).join(' ')}>
      <input {...rest} id={id} type="checkbox" role="switch" className={styles.input} />
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
    </div>
  );
}
