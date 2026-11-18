import { packageTestConfig, UI_THRESHOLDS } from '@zooloo/vitest-config';
import react from '@vitejs/plugin-react';
import { mergeConfig } from 'vitest/config';
import { zoolooTokensPlugin } from './build/tokens-css.ts';

// UI Web/PWA: RNF-QA-05 (≥ 70%, axe nas telas principais).
const base = packageTestConfig(UI_THRESHOLDS);

export default mergeConfig(base, {
  plugins: [react(), zoolooTokensPlugin()],
  resolve: { conditions: ['@zooloo/source', 'module', 'browser', 'development|production'] },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'build/**/*.test.ts'],
    setupFiles: ['./src/testing/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts', 'build/**/*.ts'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'scripts/**/*.test.ts',
        'build/**/*.test.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/testing/**',
        // Script que só grava arquivos; a lógica (PNG, rasterização) é testada à parte.
        'scripts/generate-icons.ts',
        // Vitrine de desenvolvimento, fora do build de produção.
        'src/app/pages/DesignSystemPage.tsx',
      ],
    },
  },
});
