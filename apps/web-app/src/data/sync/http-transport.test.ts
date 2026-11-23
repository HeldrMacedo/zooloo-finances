import { describe, expect, it, vi } from 'vitest';
import { HttpSyncTransport, SyncHttpError } from './http-transport.js';

const USER = '01960000-0000-7000-8111-000000000000';
const HLC = '000000000001000-000000-00000000000000aa';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('HttpSyncTransport', () => {
  it('push envia o lote com o cabeçalho do usuário e valida a resposta', async () => {
    const fetcher = vi.fn(() => Promise.resolve(json({ version: 3, rejected: [] })));
    const transport = new HttpSyncTransport(USER, fetcher);
    const mutation = {
      entity: 'categories',
      id: USER,
      op: 'upsert' as const,
      fields: { name: 'x' },
      hlc: HLC,
    };
    expect(await transport.push([mutation])).toEqual({ version: 3, rejected: [] });
    expect(fetcher).toHaveBeenCalledWith('/api/v1/sync/push', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dev-user-id': USER },
      body: JSON.stringify({ mutations: [mutation] }),
    });
  });

  it('pull monta a query e valida a página', async () => {
    const fetcher = vi.fn(() => Promise.resolve(json({ changes: [], version: 7, hasMore: false })));
    const transport = new HttpSyncTransport(USER, fetcher);
    expect(await transport.pull(7, 1000)).toEqual({ changes: [], version: 7, hasMore: false });
    expect(fetcher).toHaveBeenCalledWith('/api/v1/sync/pull?since=7&limit=1000', {
      headers: { 'x-dev-user-id': USER },
    });
  });

  it('erro HTTP vira SyncHttpError; resposta fora do contrato é recusada', async () => {
    const failing = new HttpSyncTransport(USER, () => Promise.resolve(json({}, 401)));
    await expect(failing.pull(0, 10)).rejects.toThrow(SyncHttpError);
    await expect(failing.pull(0, 10)).rejects.toThrow(/401/);
    const malformed = new HttpSyncTransport(USER, () => Promise.resolve(json({ changes: 'x' })));
    await expect(malformed.pull(0, 10)).rejects.toThrow();
  });

  it('usa o fetch global por padrão', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ changes: [], version: 0, hasMore: false }));
    await new HttpSyncTransport(USER).pull(0, 1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
