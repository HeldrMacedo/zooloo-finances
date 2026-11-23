import { render } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { appRoutes } from '../app/routes.js';
import { SyncProvider, type SyncProviderProps } from '../data/sync/SyncContext.js';
import { PrivacyProvider } from '../ui/privacy/PrivacyContext.js';
import { ThemeProvider } from '../ui/theme/ThemeContext.js';

export function withProviders(ui: ReactElement): ReactElement {
  return (
    <ThemeProvider>
      <PrivacyProvider>{ui}</PrivacyProvider>
    </ThemeProvider>
  );
}

export interface RenderAppOptions {
  readonly withDesignSystem?: boolean;
  /** Banco local e transporte do sync; sem eles o app roda sem banco local. */
  readonly sync?: Omit<SyncProviderProps, 'children'>;
}

/** Renderiza o app inteiro numa rota, com os mesmos providers de `main.tsx`. */
export function renderApp(path = '/', options: RenderAppOptions = {}) {
  const router = createMemoryRouter(
    appRoutes({ withDesignSystem: options.withDesignSystem ?? false }),
    { initialEntries: [path] },
  );
  const app = <RouterProvider router={router} />;
  return {
    router,
    ...render(
      withProviders(options.sync ? <SyncProvider {...options.sync}>{app}</SyncProvider> : app),
    ),
  };
}

/**
 * Violações de acessibilidade (axe, WCAG 2.1 AA) no container (RNF-QA-05). Contraste de cor não é
 * medido no jsdom; ele é garantido pelo teste de pares de tokens em `@zooloo/ui-tokens`.
 */
export async function axeViolations(container: Element): Promise<string[]> {
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return result.violations.map((violation) => `${violation.id}: ${violation.help}`);
}
