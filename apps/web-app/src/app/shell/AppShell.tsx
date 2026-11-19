import { t } from '@zooloo/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { DESKTOP_MEDIA, useMediaQuery } from '../../ui/media/useMediaQuery.js';
import styles from './AppShell.module.css';
import { SelectedMonthProvider } from './SelectedMonth.js';
import { Sidebar } from './Sidebar.js';
import { Topbar } from './Topbar.js';
import { useShortcuts } from './useShortcuts.js';

const COLLAPSED_STORAGE_KEY = 'zl-sidebar-collapsed';

/**
 * Estrutura do app (doc 13 §5.1): menu lateral em altura total (recolhível no desktop, gaveta em
 * telas menores) e, ao lado, cabeçalho e conteúdo em Sand.
 */
export function AppShell() {
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const desktop = useMediaQuery(DESKTOP_MEDIA, true);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1',
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  // O formulário de lançamento (drawer W-21) chega com o módulo de transações.
  const newExpense = useCallback(() => {
    void navigate('/transacoes?novo=despesa');
  }, [navigate]);
  useShortcuts({ onSearch: () => searchRef.current?.focus(), onNewExpense: newExpense });

  // Ao virar desktop a gaveta deixa de valer; fecha para não reabrir ao voltar a telas menores.
  if (desktop && drawerOpen) {
    setDrawerOpen(false);
  }

  const toggleMenu = useCallback(() => {
    if (desktop) {
      setCollapsed((current) => {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, current ? '0' : '1');
        return !current;
      });
    } else {
      setDrawerOpen((current) => !current);
    }
  }, [desktop]);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!drawerOpen) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <SelectedMonthProvider>
      <div className={styles.shell}>
        <a className={styles.skipLink} href="#conteudo">
          {t('shell.skipToContent')}
        </a>
        <Sidebar
          collapsed={desktop && collapsed}
          drawerOpen={!desktop && drawerOpen}
          inert={!desktop && !drawerOpen}
          onClose={closeDrawer}
        />
        <div
          className={styles.overlay}
          data-open={(!desktop && drawerOpen) || undefined}
          onClick={closeDrawer}
          aria-hidden="true"
        />
        <div className={styles.area}>
          <Topbar
            searchRef={searchRef}
            onNewExpense={newExpense}
            onToggleMenu={toggleMenu}
            menuExpanded={desktop ? !collapsed : drawerOpen}
          />
          <main id="conteudo" className={styles.main} tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </SelectedMonthProvider>
  );
}
