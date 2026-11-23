import { t } from '@zooloo/i18n';
import {
  CloudAlert,
  CloudCheck,
  CloudOff,
  CloudUpload,
  type LucideIcon,
  RefreshCw,
} from 'lucide-react';
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

/** Fase do sync vista pelo indicador; `unavailable` é o app sem banco local (só conectividade). */
export type SyncStatusPhase = 'unavailable' | 'opening' | 'idle' | 'syncing' | 'error';

export interface SyncStatusProps {
  /** Alterações locais ainda não enviadas (outbox). */
  readonly pending: number;
  readonly phase?: SyncStatusPhase;
}

interface View {
  readonly text: string;
  readonly icon: LucideIcon;
  readonly tone: 'plain' | 'warning';
}

function view(online: boolean, phase: SyncStatusPhase, pending: number): View {
  if (!online) {
    return { text: t('sync.offlinePending', { count: pending }), icon: CloudOff, tone: 'warning' };
  }
  if (phase === 'syncing') {
    return { text: t('sync.syncing'), icon: RefreshCw, tone: 'plain' };
  }
  if (phase === 'error') {
    return { text: t('sync.error'), icon: CloudAlert, tone: 'warning' };
  }
  if (pending > 0) {
    return { text: t('sync.onlinePending', { count: pending }), icon: CloudUpload, tone: 'plain' };
  }
  return { text: t('sync.synced'), icon: CloudCheck, tone: 'plain' };
}

/** Indicador de conectividade e sync do menu (doc 06 §2, F6). Anunciado ao mudar. */
export function SyncStatus({ pending, phase = 'unavailable' }: SyncStatusProps) {
  const online = useOnline();
  const { text, icon: Icon, tone } = view(online, phase, pending);
  return (
    <p
      className={[styles.status, tone === 'warning' && styles.offline].filter(Boolean).join(' ')}
      role="status"
    >
      <Icon aria-hidden="true" size={16} />
      <span>{text}</span>
    </p>
  );
}
