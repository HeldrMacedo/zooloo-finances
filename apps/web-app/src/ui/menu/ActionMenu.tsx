import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import styles from './ActionMenu.module.css';

export interface ActionMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: LucideIcon;
  readonly tone?: 'plain' | 'danger';
  readonly onSelect: () => void;
}

export interface ActionMenuProps {
  /** Nome acessível do botão (ex.: "Ações de Mercado"). */
  readonly label: string;
  readonly items: readonly ActionMenuItem[];
}

/**
 * Menu de ações de uma linha (padrão WAI-ARIA "menu button"): abre por clique, Enter, espaço ou
 * seta; setas, Home e End navegam; Esc fecha e devolve o foco ao botão.
 */
export function ActionMenu({ label, items }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[focusIndex]?.focus();
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, focusIndex]);

  const show = (index: number): void => {
    setFocusIndex((index + items.length) % items.length);
    setOpen(true);
  };
  const close = (): void => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onButtonKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      show(0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      show(items.length - 1);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent): void => {
    const moves: Record<string, number> = {
      ArrowDown: focusIndex + 1,
      ArrowUp: focusIndex - 1,
      Home: 0,
      End: items.length - 1,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      show(next);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={label}
        onClick={() => (open ? setOpen(false) : show(0))}
        onKeyDown={onButtonKeyDown}
      >
        <EllipsisVertical aria-hidden="true" size={18} />
        <span className="visually-hidden">{label}</span>
      </button>
      {open && (
        <div ref={menuRef} id={menuId} role="menu" aria-label={label} className={styles.menu}>
          {items.map(({ id, label: itemLabel, icon: Icon, tone, onSelect }, index) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              tabIndex={index === focusIndex ? 0 : -1}
              onKeyDown={onMenuKeyDown}
              className={[styles.item, tone === 'danger' && styles.danger]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                close();
                onSelect();
              }}
            >
              {Icon && <Icon aria-hidden="true" size={16} />}
              <span>{itemLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
