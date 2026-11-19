import type { RouteObject } from 'react-router';
import { ComingSoonPage } from './pages/ComingSoonPage.js';
import { DesignSystemPage } from './pages/DesignSystemPage.js';
import { LocalDbPocPage } from './pages/LocalDbPocPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { SummaryPage } from './pages/summary/SummaryPage.js';
import { AppShell } from './shell/AppShell.js';
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from './shell/Sidebar.js';

/** Rotas do app sob `/app/`. Cada tela do menu troca o `ComingSoonPage` quando for construída. */
export function appRoutes(options: { readonly withDesignSystem: boolean }): RouteObject[] {
  const screens = [...NAV_ITEMS, ...SECONDARY_NAV_ITEMS].map(({ to, label }) =>
    to === '/'
      ? { index: true, element: <SummaryPage /> }
      : { path: to.slice(1), element: <ComingSoonPage title={label} /> },
  );
  return [
    {
      path: '/',
      element: <AppShell />,
      children: [
        ...screens,
        ...(options.withDesignSystem
          ? [
              { path: 'design', element: <DesignSystemPage /> },
              { path: 'dev/banco-local', element: <LocalDbPocPage /> },
            ]
          : []),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ];
}
