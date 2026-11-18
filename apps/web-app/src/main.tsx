import './styles/fonts.css';
import 'virtual:zooloo-tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { appRoutes } from './app/routes.js';
import { PrivacyProvider } from './ui/privacy/PrivacyContext.js';
import { ThemeProvider } from './ui/theme/ThemeContext.js';

const router = createBrowserRouter(appRoutes({ withDesignSystem: import.meta.env.DEV }), {
  basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
});

const root = document.getElementById('root');
if (!root) {
  throw new Error('Elemento #root ausente em index.html.');
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <PrivacyProvider>
        <RouterProvider router={router} />
      </PrivacyProvider>
    </ThemeProvider>
  </StrictMode>,
);
