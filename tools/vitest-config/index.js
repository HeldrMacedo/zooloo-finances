import { defineConfig } from 'vitest/config';

// Pacotes internos exportam `src` pela condição `@zooloo/source`: testes não precisam de build.
const conditions = ['@zooloo/source', 'module', 'node', 'development|production'];

/** @typedef {{ lines: number, branches: number, functions: number, statements: number }} CoverageThresholds */

/**
 * Metas por camada: doc 04 §7A (RNF-QA-01..05).
 * @type {CoverageThresholds}
 */
export const CORE_THRESHOLDS = {
  lines: 95,
  branches: 90,
  functions: 95,
  statements: 95,
};
/** @type {CoverageThresholds} */
export const DEFAULT_THRESHOLDS = {
  lines: 90,
  branches: 90,
  functions: 90,
  statements: 90,
};

/**
 * UI Web/PWA e mobile: RNF-QA-05.
 * @type {CoverageThresholds}
 */
export const UI_THRESHOLDS = {
  lines: 70,
  branches: 70,
  functions: 70,
  statements: 70,
};

/** @param {CoverageThresholds} thresholds */
export function packageTestConfig(thresholds) {
  return defineConfig({
    resolve: { conditions },
    ssr: { resolve: { conditions, externalConditions: conditions } },
    test: {
      include: ['src/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts', 'src/index.ts'],
        thresholds: { ...thresholds },
      },
    },
  });
}
