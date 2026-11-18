import { t } from '@zooloo/i18n';
import { useCallback, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router';
import styles from './AppShell.module.css';
import { Sidebar } from './Sidebar.js';
import { Topbar } from './Topbar.js';
import { useShortcuts } from './useShortcuts.js';

/** Estrutura do app (doc 13 §5.1): topbar Midnight, menu lateral claro, conteúdo em Warm White. */
export function AppShell() {
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  // O formulário de lançamento (drawer W-21) chega com o módulo de transações.
  const newExpense = useCallback(() => {
    void navigate('/transacoes?novo=despesa');
  }, [navigate]);
  useShortcuts({ onSearch: () => searchRef.current?.focus(), onNewExpense: newExpense });

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#conteudo">
        {t('shell.skipToContent')}
      </a>
      <Topbar searchRef={searchRef} onNewExpense={newExpense} />
      <div className={styles.body}>
        <div className={styles.rail}>
          <Sidebar />
        </div>
        <main id="conteudo" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
