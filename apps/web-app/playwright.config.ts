import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

/**
 * E2E do PWA (RNF-QA-05) contra o build de produção com ferramentas de dev (`--mode e2e`), servido
 * pelo `vite preview`: o Service Worker só existe no build. Navegadores pelo canal instalado na
 * máquina (`chrome`, `msedge`); em CI, `PLAYWRIGHT_CHANNELS=chromium` usa o Chromium do Playwright.
 */
const PORT = 4178;
const channels = (process.env['PLAYWRIGHT_CHANNELS'] ?? 'chrome,msedge').split(',');

/**
 * E2E de sync (PoC 2) precisa da API e do PostgreSQL da worktree: `pnpm dev:worktree up` gera o
 * `.env.worktree`. Sem ele, os testes de sync são pulados e os demais rodam sem API.
 */
const ENV_FILE = new URL('../../.env.worktree', import.meta.url);
// Caminho fixo: raiz do repositório + nome constante.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const apiPort = existsSync(ENV_FILE)
  ? // eslint-disable-next-line security/detect-non-literal-fs-filename
    /^PORT=(\d+)$/m.exec(readFileSync(ENV_FILE, 'utf8'))?.[1]
  : undefined;
/** Ana Sintética, primeiro usuário do seed de `tools/dev-worktree` (dados sintéticos). */
const SEED_USER = '01960000-0000-7000-8111-000000000000';
if (apiPort) {
  // Lido pelos testes de sync para decidir se rodam.
  process.env['ZL_E2E_API_PORT'] = apiPort;
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: channels.map((channel) => ({
    name: channel,
    use: { ...devices['Desktop Chrome'], ...(channel === 'chromium' ? {} : { channel }) },
  })),
  webServer: [
    {
      command: `vite build --mode e2e && vite preview --mode e2e --port ${PORT}`,
      env: {
        ZL_OUT_DIR: 'dist-e2e',
        VITE_ZL_DEV_USER_ID: SEED_USER,
        ...(apiPort ? { ZL_E2E_API_PORT: apiPort } : {}),
      },
      url: `http://127.0.0.1:${PORT}/app/`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    ...(apiPort
      ? [
          {
            // API compilada da worktree; reaproveita a do `pnpm dev:worktree` se já estiver no ar.
            command: 'node --env-file=../../.env.worktree ../api/dist/main.js',
            url: `http://127.0.0.1:${apiPort}/api/v1/health/ready`,
            reuseExistingServer: true,
            timeout: 60_000,
          },
        ]
      : []),
  ],
});
