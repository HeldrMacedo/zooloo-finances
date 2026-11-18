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
} from 'lucide-react';
import { NavLink } from 'react-router';
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

function NavList({ items }: { readonly items: readonly NavItem[] }) {
  return (
    <ul className={styles.list}>
      {items.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink to={to} end={to === '/'} className={linkClass}>
            <Icon aria-hidden="true" size={18} />
            <span className={styles.label}>{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Menu lateral (doc 13 §5.1): fundo claro, item ativo em Mint. Vira trilho de ícones em telas médias. */
export function Sidebar() {
  return (
    <nav className={styles.sidebar} aria-label={t('shell.mainNav')}>
      <NavList items={NAV_ITEMS} />
      <NavList items={SECONDARY_NAV_ITEMS} />
    </nav>
  );
}
