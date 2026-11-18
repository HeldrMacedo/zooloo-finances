import { t } from '@zooloo/i18n';
import { CloudCheck, CloudOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import styles from './SyncStatus.module.css';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine);
}

export interface SyncStatusProps {
  /** Alterações locais ainda não enviadas (outbox). Até existir o `sync-core`, sempre 0. */
  readonly pending: number;
}

/** Indicador de conectividade e sync da topbar (doc 06 §2, F6). Anunciado ao mudar. */
export function SyncStatus({ pending }: SyncStatusProps) {
  const online = useOnline();
  const text = online ? t('sync.synced') : t('sync.offlinePending', { count: pending });
  const Icon = online ? CloudCheck : CloudOff;
  return (
    <p
      className={[styles.status, !online && styles.offline].filter(Boolean).join(' ')}
      role="status"
    >
      <Icon aria-hidden="true" size={16} />
      <span>{text}</span>
    </p>
  );
}
