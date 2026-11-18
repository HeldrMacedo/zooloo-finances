import { defineConfig } from 'vitest/config';

// Meta global de cobertura: RNF-QA-01 (docs/product-specs/04-requisitos-nao-funcionais.md §7A).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
