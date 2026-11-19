import { serwist } from '@serwist/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { zoolooTokensPlugin } from './build/tokens-css.ts';

// Pacotes internos lidos de src/ (ADR-0004).
const conditions = ['@zooloo/source', 'module', 'browser', 'development|production'];

/** Porta e API vêm do `.env.worktree` quando rodando por `pnpm dev:worktree` (doc 12 §4). */
const webPort = Number(process.env['ZL_WEB_PORT'] ?? 5173);
const apiTarget = `http://127.0.0.1:${process.env['PORT'] ?? 3000}`;
/** O build de E2E (com ferramentas de dev) vai para outra pasta e nunca se mistura ao de produção. */
const outDir = process.env['ZL_OUT_DIR'] ?? 'dist';

export default defineConfig({
  base: '/app/',
  plugins: [
    react(),
    zoolooTokensPlugin(),
    // Service Worker com precache do app shell (doc 07 §4A); só no build.
    serwist({
      swSrc: 'src/sw.ts',
      swDest: 'sw.js',
      swUrl: '/app/sw.js',
      globDirectory: outDir,
      scope: '/app/',
      base: '/app/',
      rollupFormat: 'iife',
      globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest,wasm}'],
      // O sqlite3.wasm (~1 MB) precisa estar no precache para o banco abrir offline.
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    }),
  ],
  resolve: { conditions },
  // O sqlite-wasm resolve o .wasm por `new URL(..., import.meta.url)`: não pode ser pré-empacotado.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
  server: {
    host: '127.0.0.1',
    port: webPort,
    strictPort: true,
    proxy: { '/api': { target: apiTarget, changeOrigin: false } },
  },
  // Sem proxy no preview: o E2E roda sem API.
  preview: { host: '127.0.0.1', strictPort: true, proxy: {} },
  build: { outDir, sourcemap: true, target: 'es2023' },
});
