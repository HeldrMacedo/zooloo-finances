import { t } from '@zooloo/i18n';
import { Link } from 'react-router';
import styles from './pages.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('shell.notFoundTitle')}</h1>
      <p className={styles.emptyBody}>{t('shell.notFoundBody')}</p>
      <p>
        <Link to="/">{t('shell.backToSummary')}</Link>
      </p>
    </div>
  );
}
