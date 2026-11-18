import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

interface ThemeState {
  readonly choice: ThemeChoice;
  /** Alterna em ciclo: automático → claro → escuro. */
  cycle(): void;
}

const ORDER: readonly ThemeChoice[] = ['system', 'light', 'dark'];
export const THEME_STORAGE_KEY = 'zl-theme';

const ThemeContext = createContext<ThemeState>({ choice: 'system', cycle: () => undefined });

function readChoice(): ThemeChoice {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** Aplica no `<html>`; `public/theme-init.js` faz o mesmo antes da pintura, sem piscar. */
export function applyTheme(choice: ThemeChoice): void {
  if (choice === 'system') {
    delete document.documentElement.dataset['theme'];
    localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    document.documentElement.dataset['theme'] = choice;
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  }
}

/** Tema claro, escuro ou automático (RF-CFG-01), lembrado neste dispositivo. */
export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [choice, setChoice] = useState(readChoice);
  const cycle = useCallback(() => {
    setChoice((current) => {
      const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? 'system';
      applyTheme(next);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ choice, cycle }), [choice, cycle]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeState {
  return use(ThemeContext);
}
