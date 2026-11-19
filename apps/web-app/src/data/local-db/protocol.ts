/** Método do driver `sqlite-proxy` do Drizzle. */
export type QueryMethod = 'run' | 'all' | 'values' | 'get';

export interface QueryRequest {
  readonly sql: string;
  readonly params: readonly unknown[];
  readonly method: QueryMethod;
}

/** `rows`: linhas em arrays; em `get`, uma linha só (ou vazio). Formato do `sqlite-proxy`. */
export interface QueryResult {
  readonly rows: unknown[];
}

/** Mensagens entre abas pelo BroadcastChannel (mesma origem). */
export type TabMessage =
  | { readonly kind: 'hello'; readonly from: string }
  | { readonly kind: 'leader'; readonly tabId: string }
  | ({ readonly kind: 'request'; readonly id: string; readonly from: string } & QueryRequest)
  | {
      readonly kind: 'response';
      readonly id: string;
      readonly to: string;
      readonly result?: QueryResult;
      readonly error?: string;
    };

/** Mensagens entre a aba líder e o Web Worker que abre o SQLite. */
export type WorkerRequest =
  | ({ readonly kind: 'query'; readonly id: number } & QueryRequest)
  | { readonly kind: 'wipe'; readonly id: number };

export type WorkerResponse =
  | { readonly kind: 'ready'; readonly storage: StorageInfo }
  | { readonly kind: 'failed'; readonly error: string }
  | { readonly kind: 'result'; readonly id: number; readonly result: QueryResult }
  | { readonly kind: 'error'; readonly id: number; readonly error: string };

export interface StorageInfo {
  /** VFS em uso; `opfs-sahpool` é o único aceito para o modo offline (doc 09 §4). */
  readonly vfs: string;
  readonly file: string;
  /** Migrações aplicadas nesta abertura. */
  readonly migrated: readonly string[];
}

export function isTabMessage(value: unknown): value is TabMessage {
  if (typeof value !== 'object' || value === null || !('kind' in value)) {
    return false;
  }
  const kind = (value as { kind: unknown }).kind;
  return kind === 'hello' || kind === 'leader' || kind === 'request' || kind === 'response';
}
