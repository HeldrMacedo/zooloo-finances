import { DEFAULT_THRESHOLDS, packageTestConfig } from '@zooloo/vitest-config';
import { mergeConfig } from 'vitest/config';

// Ferramenta interna: meta global (RNF-QA-01). O seed é testado contra PostgreSQL real.
export default mergeConfig(packageTestConfig(DEFAULT_THRESHOLDS), {
  test: {
    hookTimeout: 180_000,
    testTimeout: 30_000,
    // cli.ts só orquestra processos externos (docker, tsc, node); a lógica está nos outros módulos.
    coverage: { exclude: ['src/cli.ts'] },
  },
});
