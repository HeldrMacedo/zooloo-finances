/** Registra o Service Worker só no build de produção (em dev o Vite serve módulos sem precache). */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }
  void navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' });
}
