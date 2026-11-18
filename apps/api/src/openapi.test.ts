import { describe, expect, it } from 'vitest';
import type { Env } from './config/env.js';
import { isOpenApiUiEnabled } from './openapi.js';

const env = (overrides: Partial<Env>) =>
  ({ NODE_ENV: 'development', OPENAPI_UI: true, ...overrides }) as Env;

describe('isOpenApiUiEnabled', () => {
  it('nunca em produção, mesmo pedindo', () => {
    expect(isOpenApiUiEnabled(env({ NODE_ENV: 'production' }))).toBe(false);
  });

  it('fora de produção só quando OPENAPI_UI=true', () => {
    expect(isOpenApiUiEnabled(env({}))).toBe(true);
    expect(isOpenApiUiEnabled(env({ OPENAPI_UI: false }))).toBe(false);
  });
});
