import type { Mutation, PullPage, PushResult, SyncTransport } from '@zooloo/sync-core';
import { SyncPullResponseSchema, SyncPushResponseSchema } from '@zooloo/validation';

export class SyncHttpError extends Error {
  override readonly name = 'SyncHttpError';

  constructor(readonly status: number) {
    super(`Sync respondeu ${status}.`);
  }
}

/**
 * Porta de rede do sync (`SyncTransport`) sobre a API `/api/v1/sync` (doc 07 §4). Valida as
 * respostas com Zod antes de tocar no banco local. A identificação é o cabeçalho provisório de
 * desenvolvimento até a sessão existir (ADR-0007).
 */
export class HttpSyncTransport implements SyncTransport {
  constructor(
    private readonly userId: string,
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init),
    private readonly base = '/api/v1/sync',
  ) {}

  async push(mutations: readonly Mutation[]): Promise<PushResult> {
    const response = await this.fetcher(`${this.base}/push`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...this.headers() },
      body: JSON.stringify({ mutations }),
    });
    return SyncPushResponseSchema.parse(await this.json(response));
  }

  async pull(since: number, limit: number): Promise<PullPage> {
    const query = new URLSearchParams({ since: String(since), limit: String(limit) });
    const response = await this.fetcher(`${this.base}/pull?${query.toString()}`, {
      headers: this.headers(),
    });
    return SyncPullResponseSchema.parse(await this.json(response));
  }

  private headers(): Record<string, string> {
    return { 'x-dev-user-id': this.userId };
  }

  private async json(response: Response): Promise<unknown> {
    if (!response.ok) {
      throw new SyncHttpError(response.status);
    }
    return response.json();
  }
}
