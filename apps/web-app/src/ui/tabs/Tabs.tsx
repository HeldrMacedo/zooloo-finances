import { type KeyboardEvent, type ReactNode, useId, useRef } from 'react';
import styles from './Tabs.module.css';

export interface TabItem<K extends string> {
  readonly key: K;
  readonly label: string;
}

export interface TabsProps<K extends string> {
  /** Nome acessível da lista de abas. */
  readonly label: string;
  readonly tabs: readonly TabItem<K>[];
  readonly selected: K;
  readonly onSelect: (key: K) => void;
  readonly children: ReactNode;
}

/**
 * Abas (padrão WAI-ARIA "tabs", ativação automática): setas esquerda e direita, Home e End trocam
 * de aba; só a aba ativa entra na ordem de foco.
 */
export function Tabs<K extends string>({
  label,
  tabs,
  selected,
  onSelect,
  children,
}: TabsProps<K>) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === selected),
  );

  const go = (next: number): void => {
    const target = tabs[(next + tabs.length) % tabs.length];
    if (target) {
      onSelect(target.key);
      listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${target.key}"]`)?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      go(next);
    }
  };

  return (
    <div className={styles.tabs}>
      <div ref={listRef} role="tablist" aria-label={label} className={styles.list}>
        {tabs.map((tab) => {
          const active = tab.key === selected;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.key}`}
              data-tab={tab.key}
              aria-selected={active}
              aria-controls={`${baseId}-panel`}
              tabIndex={active ? 0 : -1}
              className={styles.tab}
              onClick={() => onSelect(tab.key)}
              onKeyDown={onKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${selected}`}
        className={styles.panel}
      >
        {children}
      </div>
    </div>
  );
}
