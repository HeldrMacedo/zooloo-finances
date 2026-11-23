import { type Browser, expect, type Page, test } from '@playwright/test';

/**
 * PoC 2 (doc 11 §3, F6): dois "computadores" (contextos com OPFS separados) sincronizam pela API
 * real da worktree. Precisa de `pnpm dev:worktree up` (PostgreSQL com seed sintético).
 */
test.skip(
  !process.env['ZL_E2E_API_PORT'],
  'Sem .env.worktree: rode `pnpm dev:worktree up` para testar o sync contra a API.',
);

async function openDevice(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/app/dev/sync');
  await sync(page);
  return page;
}

async function sync(page: Page): Promise<void> {
  // A página troca a mensagem para "Sincronizando…" ao começar; o resultado só aparece no fim.
  await page.getByRole('button', { name: 'Sincronizar' }).click();
  await expect(page.getByRole('main').getByRole('status')).toContainText(
    /Sincronizado: \d+ enviadas/,
  );
}

const list = (page: Page) => page.getByRole('list', { name: 'Categorias sincronizadas' });

async function rename(page: Page, from: string, to: string): Promise<void> {
  await page.getByRole('textbox', { name: `Nome de ${from}` }).fill(to);
  await page.getByRole('button', { name: `Renomear ${from}` }).click();
  await expect(list(page).getByRole('textbox', { name: `Nome de ${to}` })).toBeVisible();
}

test('cria em um computador e aparece no outro', async ({ browser }) => {
  const name = `E2E criada ${Date.now()}`;
  const a = await openDevice(browser);
  const b = await openDevice(browser);
  await expect(list(a).getByRole('textbox', { name: 'Nome de Lazer' })).toBeVisible();

  await a.getByRole('textbox', { name: 'Nova categoria' }).fill(name);
  await a.getByRole('button', { name: 'Adicionar' }).click();
  await expect(a.getByText('Alterações pendentes: 1')).toBeVisible();
  await sync(a);
  await expect(a.getByText('Alterações pendentes: 0')).toBeVisible();

  await sync(b);
  await expect(list(b).getByRole('textbox', { name: `Nome de ${name}` })).toBeVisible();
});

test('edição concorrente offline e exclusão convergem nos dois computadores', async ({
  browser,
}) => {
  const stamp = Date.now();
  const shared = `E2E compartilhada ${stamp}`;
  const doomed = `E2E apagar ${stamp}`;
  const a = await openDevice(browser);
  for (const name of [shared, doomed]) {
    await a.getByRole('textbox', { name: 'Nova categoria' }).fill(name);
    await a.getByRole('button', { name: 'Adicionar' }).click();
  }
  await sync(a);
  const b = await openDevice(browser);
  await expect(list(b).getByRole('textbox', { name: `Nome de ${doomed}` })).toBeVisible();

  // Os dois ficam sem rede e mudam a mesma categoria; b muda depois, então vence (maior HLC).
  await a.context().setOffline(true);
  await b.context().setOffline(true);
  await rename(a, shared, `${shared} A`);
  await rename(b, shared, `${shared} B`);
  await b.getByRole('button', { name: `Excluir ${doomed}` }).click();
  await expect(b.getByText('Alterações pendentes: 2')).toBeVisible();
  await expect(b.getByRole('button', { name: 'Sincronizar' })).toBeDisabled();

  // Rede de volta: a fila sai sozinha (evento online) e um sync final distribui tudo.
  await a.context().setOffline(false);
  await b.context().setOffline(false);
  await expect(b.getByText('Alterações pendentes: 0')).toBeVisible();
  await expect(a.getByText('Alterações pendentes: 0')).toBeVisible();
  await sync(a);
  await sync(b);

  for (const page of [a, b]) {
    await expect(list(page).getByRole('textbox', { name: `Nome de ${shared} B` })).toBeVisible();
    await expect(list(page).getByRole('textbox', { name: `Nome de ${shared} A` })).toHaveCount(0);
    await expect(list(page).getByRole('textbox', { name: `Nome de ${doomed}` })).toHaveCount(0);
  }
});
