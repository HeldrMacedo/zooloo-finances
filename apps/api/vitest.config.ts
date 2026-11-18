import { DEFAULT_THRESHOLDS, packageTestConfig } from '@zooloo/vitest-config';
import { mergeConfig } from 'vitest/config';

// API e workers: RNF-QA-03 (≥ 90%, PostgreSQL real com Testcontainers).
export default mergeConfig(packageTestConfig(DEFAULT_THRESHOLDS), {
  // Injeção de dependência do Nest lê os tipos dos construtores: precisa de decorator metadata.
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
  test: {
    hookTimeout: 180_000,
    testTimeout: 30_000,
    coverage: { exclude: ['src/main.ts', 'src/openapi-cli.ts'] },
  },
});
