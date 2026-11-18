import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { zoolooTokensPlugin } from './build/tokens-css.ts';

// Pacotes internos lidos de src/ (ADR-0004).
const conditions = ['@zooloo/source', 'module', 'browser', 'development|production'];

/** Porta e API vêm do `.env.worktree` quando rodando por `pnpm dev:worktree` (doc 12 §4). */
const webPort = Number(process.env['ZL_WEB_PORT'] ?? 5173);
const apiTarget = `http://127.0.0.1:${process.env['PORT'] ?? 3000}`;

export default defineConfig({
  base: '/app/',
  plugins: [react(), zoolooTokensPlugin()],
  resolve: { conditions },
  server: {
    host: '127.0.0.1',
    port: webPort,
    strictPort: true,
    proxy: { '/api': { target: apiTarget, changeOrigin: false } },
  },
  build: { sourcemap: true, target: 'es2023' },
});
