import './styles/fonts.css';
import 'virtual:zooloo-tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { appRoutes } from './app/routes.js';
import { createBrowserLocalDb } from './data/local-db/create.js';
import { LocalDbProvider } from './data/local-db/LocalDbContext.js';
import { registerServiceWorker } from './pwa/register.js';
import { PrivacyProvider } from './ui/privacy/PrivacyContext.js';
import { ThemeProvider } from './ui/theme/ThemeContext.js';

// Ferramentas de desenvolvimento (vitrine e PoC do banco local): dev e build de E2E, nunca produção.
const withDevTools = import.meta.env.DEV || import.meta.env['VITE_DEV_TOOLS'] === 'true';
const router = createBrowserRouter(appRoutes({ withDesignSystem: withDevTools }), {
  basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
});

registerServiceWorker();
// Navegador sem Web Locks ou OPFS: o app segue sem banco local (modo online, RN-PWA-05).
const localDb = 'locks' in navigator ? createBrowserLocalDb() : null;

const root = document.getElementById('root');
if (!root) {
  throw new Error('Elemento #root ausente em index.html.');
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <PrivacyProvider>
        <LocalDbProvider coordinator={localDb}>
          <RouterProvider router={router} />
        </LocalDbProvider>
      </PrivacyProvider>
    </ThemeProvider>
  </StrictMode>,
);
