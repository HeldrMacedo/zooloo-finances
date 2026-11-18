import { useEffect } from 'react';

export interface ShortcutHandlers {
  readonly onSearch: () => void;
  readonly onNewExpense: () => void;
}

/** Não dispara atalho enquanto a pessoa digita num campo. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Atalhos globais do Web (RNF-UX-05, RF-LAN-15): `/` busca, `N` nova despesa. */
export function useShortcuts({ onSearch, onNewExpense }: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (isTyping(event.target)) {
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        onSearch();
      } else if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        onNewExpense();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSearch, onNewExpense]);
}
