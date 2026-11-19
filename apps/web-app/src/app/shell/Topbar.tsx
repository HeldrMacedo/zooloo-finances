import { formatLocalDate, t } from '@zooloo/i18n';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Menu,
  Monitor,
  Moon,
  Plus,
  Search,
  Sun,
} from 'lucide-react';
import type { Ref } from 'react';
import { currentHour } from '../../data/clock.js';
import { Button } from '../../ui/button/Button.js';
import { usePrivacy } from '../../ui/privacy/PrivacyContext.js';
import { type ThemeChoice, useTheme } from '../../ui/theme/ThemeContext.js';
import { useSelectedMonth } from './SelectedMonth.js';
import styles from './Topbar.module.css';

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

const themeName = (choice: ThemeChoice): string => t(`theme.${choice}`);

function greeting(hour: number): string {
  if (hour < 12) {
    return t('shell.greetingMorning');
  }
  return hour < 18 ? t('shell.greetingAfternoon') : t('shell.greetingEvening');
}

export interface TopbarProps {
  readonly searchRef: Ref<HTMLInputElement>;
  readonly onNewExpense: () => void;
  readonly onToggleMenu: () => void;
  /** Gaveta do menu aberta (telas menores) ou menu expandido (desktop). */
  readonly menuExpanded: boolean;
}

/**
 * Cabeçalho do conteúdo (doc 13 §5.1, doc 06 §2): menu, saudação e, à direita, mês, busca,
 * privacidade, tema e novo lançamento.
 */
export function Topbar({ searchRef, onNewExpense, onToggleMenu, menuExpanded }: TopbarProps) {
  const privacy = usePrivacy();
  const theme = useTheme();
  const { month, previous, next } = useSelectedMonth();
  const monthName = formatLocalDate(month, 'month');
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <Button
          iconOnly
          icon={Menu}
          onClick={onToggleMenu}
          aria-expanded={menuExpanded}
          className={styles.menu}
        >
          {t('shell.toggleMenu')}
        </Button>
        <div className={styles.greeting}>
          <p className={styles.greetingTitle}>{greeting(currentHour())}</p>
          <p className={styles.greetingSub}>{t('shell.greetingSubtitle', { month: monthName })}</p>
        </div>
      </div>
      <div className={styles.actions}>
        <div className={styles.monthPicker} role="group" aria-label={t('month.label')}>
          <button
            type="button"
            className={styles.monthArrow}
            onClick={previous}
            title={t('month.previous')}
          >
            <ChevronLeft aria-hidden="true" size={15} />
            <span className="visually-hidden">{t('month.previous')}</span>
          </button>
          <span className={styles.monthLabel} aria-live="polite">
            {monthName}
          </span>
          <button
            type="button"
            className={styles.monthArrow}
            onClick={next}
            title={t('month.next')}
          >
            <ChevronRight aria-hidden="true" size={15} />
            <span className="visually-hidden">{t('month.next')}</span>
          </button>
        </div>
        <search className={styles.search}>
          <Search className={styles.searchIcon} aria-hidden="true" size={15} />
          <label className="visually-hidden" htmlFor="global-search">
            {t('shell.searchLabel')}
          </label>
          <input
            ref={searchRef}
            id="global-search"
            type="search"
            className={styles.searchInput}
            placeholder={t('shell.searchPlaceholder')}
            aria-keyshortcuts="/"
          />
        </search>
        <Button
          iconOnly
          icon={privacy.hidden ? EyeOff : Eye}
          aria-pressed={privacy.hidden}
          onClick={privacy.toggle}
        >
          {privacy.hidden ? t('privacy.showValues') : t('privacy.hideValues')}
        </Button>
        <Button iconOnly icon={THEME_ICON[theme.choice]} onClick={theme.cycle}>
          {t('theme.switchTo', { current: themeName(theme.choice) })}
        </Button>
        <Button variant="primary" icon={Plus} onClick={onNewExpense} aria-keyshortcuts="N">
          {t('actions.newExpense')}
        </Button>
      </div>
    </header>
  );
}
