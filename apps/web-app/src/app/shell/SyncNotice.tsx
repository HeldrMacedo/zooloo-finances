import { t } from '@zooloo/i18n';
import { TriangleAlert, X } from 'lucide-react';
import { useSync } from '../../data/sync/SyncContext.js';
import styles from './SyncNotice.module.css';

/**
 * Aviso de mutações recusadas pelo servidor e desfeitas neste aparelho (TD-020). Sem ele, a edição
 * some sem explicação quando o servidor aplica uma regra que o aparelho não viu.
 */
export function SyncNotice() {
  const { state, dismissRejected } = useSync();
  if (state.rejected === 0) {
    return null;
  }
  return (
    <div className={styles.notice} role="alert">
      <TriangleAlert aria-hidden="true" size={18} />
      <p>{t('sync.rejected', { count: state.rejected })}</p>
      <button
        type="button"
        className={styles.dismiss}
        onClick={dismissRejected}
        title={t('sync.dismiss')}
      >
        <X aria-hidden="true" size={16} />
        <span className="visually-hidden">{t('sync.dismiss')}</span>
      </button>
    </div>
  );
}
