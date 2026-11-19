import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './register.js';

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('não registra fora do build de produção', () => {
    const register = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
    registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('em produção registra /app/sw.js com escopo /app/', () => {
    vi.stubEnv('PROD', true);
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
    registerServiceWorker();
    expect(register).toHaveBeenCalledWith('/app/sw.js', { scope: '/app/' });
  });

  it('em produção, navegador sem Service Worker segue sem erro', () => {
    vi.stubEnv('PROD', true);
    expect(() => registerServiceWorker()).not.toThrow();
  });
});
