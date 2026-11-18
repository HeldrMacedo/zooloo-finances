import { t } from '@zooloo/i18n';
import { Hammer } from 'lucide-react';
import styles from './pages.module.css';

/** Telas do menu que ainda não foram construídas: diz isso com clareza, sem dados falsos. */
export function ComingSoonPage({ title }: { readonly title: string }) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.empty}>
        <Hammer aria-hidden="true" size={28} className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>{t('shell.comingSoonTitle')}</h2>
        <p className={styles.emptyBody}>{t('shell.comingSoonBody')}</p>
      </div>
    </div>
  );
}
