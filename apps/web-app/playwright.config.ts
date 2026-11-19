import { defineConfig, devices } from '@playwright/test';

/**
 * E2E do PWA (RNF-QA-05) contra o build de produção com ferramentas de dev (`--mode e2e`), servido
 * pelo `vite preview`: o Service Worker só existe no build. Navegadores pelo canal instalado na
 * máquina (`chrome`, `msedge`); em CI, `PLAYWRIGHT_CHANNELS=chromium` usa o Chromium do Playwright.
 */
const PORT = 4178;
const channels = (process.env['PLAYWRIGHT_CHANNELS'] ?? 'chrome,msedge').split(',');

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
  webServer: {
    command: `vite build --mode e2e && vite preview --mode e2e --port ${PORT}`,
    env: { ZL_OUT_DIR: 'dist-e2e' },
    url: `http://127.0.0.1:${PORT}/app/`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
