import { CORE_THRESHOLDS, packageTestConfig } from '@zooloo/vitest-config';
import { mergeConfig } from 'vitest/config';

// Pacote de risco alto (doc 12 §6.2). Testes sobem PostgreSQL real com Testcontainers (RNF-QA-03).
export default mergeConfig(packageTestConfig(CORE_THRESHOLDS), {
  test: {
    hookTimeout: 180_000,
    testTimeout: 30_000,
    coverage: { exclude: ['src/testing/**'] },
  },
});
