import { t } from '@zooloo/i18n';
import {
  ArrowLeftRight,
  CalendarDays,
  ChartPie,
  CreditCard,
  Goal,
  LayoutDashboard,
  type LucideIcon,
  PiggyBank,
  Settings,
  Tags,
  Wallet,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router';
import { ZoolooLogo } from '../../ui/brand/ZoolooLogo.js';
import { SyncStatus } from '../../ui/sync/SyncStatus.js';
import styles from './Sidebar.module.css';

const linkClass = styles['link'] ?? '';

export interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

/** Itens do menu no MVP (doc 06 §2, doc 11 §4.3). Os demais entram com as fases seguintes. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: t('nav.summary'), icon: LayoutDashboard },
  { to: '/transacoes', label: t('nav.transactions'), icon: ArrowLeftRight },
  { to: '/contas', label: t('nav.accounts'), icon: Wallet },
  { to: '/cartoes', label: t('nav.cards'), icon: CreditCard },
  { to: '/orcamentos', label: t('nav.budgets'), icon: PiggyBank },
  { to: '/objetivos', label: t('nav.goals'), icon: Goal },
  { to: '/graficos', label: t('nav.charts'), icon: ChartPie },
  { to: '/calendario', label: t('nav.calendar'), icon: CalendarDays },
];

export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  { to: '/categorias', label: t('nav.categories'), icon: Tags },
  { to: '/configuracoes', label: t('nav.settings'), icon: Settings },
];

function NavList({
  items,
  onNavigate,
}: {
  readonly items: readonly NavItem[];
  readonly onNavigate: () => void;
}) {
  return (
    <ul className={styles.list}>
      {items.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={to === '/'}
            className={linkClass}
            title={label}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" size={19} />
            <span className={styles.label}>{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export interface SidebarProps {
  /** Desktop: trilho só com ícones. */
  readonly collapsed: boolean;
  /** Telas menores: gaveta aberta sobre o conteúdo. */
  readonly drawerOpen: boolean;
  /** Gaveta fechada fica fora da ordem de foco. */
  readonly inert: boolean;
  readonly onClose: () => void;
}

/**
 * Menu lateral (doc 13 §5.1): altura total, marca no topo, item ativo Midnight e sync no rodapé.
 * Recolhe para trilho de ícones no desktop e vira gaveta abaixo de 1024 px.
 */
export function Sidebar({ collapsed, drawerOpen, inert, onClose }: SidebarProps) {
  return (
    <aside
      className={styles.sidebar}
      data-collapsed={collapsed || undefined}
      data-open={drawerOpen || undefined}
      inert={inert}
    >
      <div className={styles.brand}>
        <ZoolooLogo variant={collapsed ? 'mark' : 'horizontal'} tagline={t('shell.brandTagline')} />
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          title={t('shell.closeMenu')}
        >
          <X aria-hidden="true" size={18} />
          <span className="visually-hidden">{t('shell.closeMenu')}</span>
        </button>
      </div>
      <nav className={styles.nav} aria-label={t('shell.mainNav')}>
        <NavList items={NAV_ITEMS} onNavigate={onClose} />
        <NavList items={SECONDARY_NAV_ITEMS} onNavigate={onClose} />
      </nav>
      <div className={styles.footer}>
        <SyncStatus pending={0} />
      </div>
    </aside>
  );
}
