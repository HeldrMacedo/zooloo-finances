import { defineConfig } from 'vitest/config';

// Metas do núcleo financeiro: RNF-QA-02 (docs/product-specs/04-requisitos-nao-funcionais.md §7A).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: { lines: 95, branches: 90, functions: 95, statements: 95 },
    },
  },
});
