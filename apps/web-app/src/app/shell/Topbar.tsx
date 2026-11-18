import { t } from '@zooloo/i18n';
import { Eye, EyeOff, Monitor, Moon, Plus, Search, Sun } from 'lucide-react';
import type { Ref } from 'react';
import { ZoolooLogo } from '../../ui/brand/ZoolooLogo.js';
import { Button } from '../../ui/button/Button.js';
import { usePrivacy } from '../../ui/privacy/PrivacyContext.js';
import { SyncStatus } from '../../ui/sync/SyncStatus.js';
import { type ThemeChoice, useTheme } from '../../ui/theme/ThemeContext.js';
import styles from './Topbar.module.css';

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

const themeName = (choice: ThemeChoice): string => t(`theme.${choice}`);

export interface TopbarProps {
  readonly searchRef: Ref<HTMLInputElement>;
  readonly onNewExpense: () => void;
}

/** Topbar Midnight (doc 13 §5.1, doc 06 §2): marca, busca, novo lançamento, privacidade, tema, sync. */
export function Topbar({ searchRef, onNewExpense }: TopbarProps) {
  const privacy = usePrivacy();
  const theme = useTheme();
  return (
    <header className={styles.topbar}>
      <ZoolooLogo tone="negative" />
      <search className={styles.search}>
        <Search className={styles.searchIcon} aria-hidden="true" size={16} />
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
      <div className={styles.actions}>
        <SyncStatus pending={0} />
        <Button
          variant="ghost"
          iconOnly
          icon={privacy.hidden ? EyeOff : Eye}
          aria-pressed={privacy.hidden}
          onClick={privacy.toggle}
          className={styles.onDark}
        >
          {privacy.hidden ? t('privacy.showValues') : t('privacy.hideValues')}
        </Button>
        <Button
          variant="ghost"
          iconOnly
          icon={THEME_ICON[theme.choice]}
          onClick={theme.cycle}
          className={styles.onDark}
        >
          {t('theme.switchTo', { current: themeName(theme.choice) })}
        </Button>
        <Button variant="primary" icon={Plus} onClick={onNewExpense} aria-keyshortcuts="N">
          {t('actions.newExpense')}
        </Button>
      </div>
    </header>
  );
}
