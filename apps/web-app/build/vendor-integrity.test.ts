/// <reference types="node" />
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Vitest roda na pasta do pacote (apps/web-app). Hashes do build do SQLite3 Multiple Ciphers (vendor/sqlite3mc/SOURCE.md, ADR-0008). */
const SQLITE3MC = {
  'sqlite3.mjs': '4eef14ec482818b6261e9df2641cddc8b3e63936df7e59e1fa607e2fe24a7381',
  'sqlite3.wasm': '5087143d75e160f19b2178c042d152575bed8befe04a0a8b80e576cd6168505d',
};

describe('vendor/sqlite3mc', () => {
  it.each(Object.entries(SQLITE3MC))('%s não foi alterado', (file, expected) => {
    const bytes = readFileSync(resolve('vendor/sqlite3mc', file));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected);
  });
});
