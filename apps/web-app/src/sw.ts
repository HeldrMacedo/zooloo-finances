/// <reference lib="webworker" />
import { type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist';

/**
 * Service Worker do PWA (doc 07 §4A, doc 10 §8). Escopo `/app/`. Faz precache do app shell para
 * abrir offline. Nunca guarda respostas da API: dados financeiros ficam só no banco local
 * controlado pelo app (RNF-PWA-04), por isso não há `runtimeCaching`.
 */
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // Injetado pelo build (@serwist/vite); vazio só se o plugin não rodar.
  precacheEntries: self.__SW_MANIFEST ?? [],
  precacheOptions: {
    cleanupOutdatedCaches: true,
    // Navegação SPA offline: qualquer rota do app abre o index do precache.
    navigateFallback: '/app/index.html',
    navigateFallbackDenylist: [/^\/api\//],
  },
  // Versão nova espera as abas fecharem; o aviso de atualização (RF-PWA-09) vem depois.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [],
});

serwist.addEventListeners();
