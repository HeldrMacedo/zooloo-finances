import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react';

interface PrivacyState {
  readonly hidden: boolean;
  toggle(): void;
}

const PrivacyContext = createContext<PrivacyState>({ hidden: false, toggle: () => undefined });

const STORAGE_KEY = 'zl-privacy';

/**
 * Modo privado (RNF-UX-03, RF-DSH-03): oculta valores em todas as telas. Lembrado neste
 * dispositivo; não é segurança, é discrição diante de quem olha a tela.
 */
export function PrivacyProvider({ children }: { readonly children: ReactNode }) {
  const [hidden, setHidden] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const toggle = useCallback(() => {
    setHidden((current) => {
      localStorage.setItem(STORAGE_KEY, current ? '0' : '1');
      return !current;
    });
  }, []);
  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle]);
  return <PrivacyContext value={value}>{children}</PrivacyContext>;
}

export function usePrivacy(): PrivacyState {
  return use(PrivacyContext);
}
