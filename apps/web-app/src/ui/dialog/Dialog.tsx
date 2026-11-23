import { t } from '@zooloo/i18n';
import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import styles from './Dialog.module.css';

export interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  /** Texto de apoio abaixo do título, ligado por `aria-describedby`. */
  readonly description?: string | undefined;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/**
 * Diálogo modal (doc 13 §5): `<dialog>` nativo com `showModal()`, que prende o foco, fecha no Esc e
 * devolve o foco a quem abriu. Sem `showModal` (jsdom), abre pelo atributo `open`.
 */
export function Dialog({ open, title, onClose, description, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) {
      return undefined;
    }
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    // Campo marcado recebe o foco; sem ele, o primeiro focável (como o `showModal` faria).
    (
      dialog.querySelector<HTMLElement>('[data-autofocus]') ??
      dialog.querySelector<HTMLElement>('button, input, select, textarea, [href]')
    )?.focus();
    const onCancel = (event: Event): void => {
      event.preventDefault();
      onCloseRef.current();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('keydown', onKeyDown);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('keydown', onKeyDown);
      if (typeof dialog.close === 'function') {
        dialog.close();
      }
      dialog.removeAttribute('open');
      opener?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button type="button" className={styles.close} onClick={onClose} title={t('actions.close')}>
          <X aria-hidden="true" size={18} />
          <span className="visually-hidden">{t('actions.close')}</span>
        </button>
      </header>
      {description && (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      )}
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </dialog>
  );
}
