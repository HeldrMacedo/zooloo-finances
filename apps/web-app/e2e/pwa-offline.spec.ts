import { expect, type Page, test } from '@playwright/test';

/** PoC 1 (doc 09 §8, doc 11 §3): banco local em OPFS, aba líder, offline e instalabilidade. */
const POC = '/app/dev/banco-local';

const role = (page: Page) => page.getByText(/^(Esta aba é a líder|Esta aba é seguidora)/);
const total = (page: Page) => page.getByText(/^Categorias de teste: \d+$/);

async function add(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Adicionar categoria de teste' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Categoria adicionada.' })).toBeVisible();
}

test('banco local abre em OPFS com migrações e persiste após recarregar', async ({ page }) => {
  await page.goto(POC);
  await expect(role(page)).toHaveText('Esta aba é a líder e abre o banco local.');
  await expect(page.getByText('VFS zooloo-sahpool, arquivo /zooloo.sqlite3')).toBeVisible();
  await expect(total(page)).toHaveText('Categorias de teste: 0');
  await add(page);
  await add(page);
  await expect(total(page)).toHaveText('Categorias de teste: 2');
  await page.reload();
  await expect(total(page)).toHaveText('Categorias de teste: 2');
});

test('só uma aba é líder; a seguidora grava pela líder e assume quando ela fecha (F6)', async ({
  context,
}) => {
  const first = await context.newPage();
  await first.goto(POC);
  await expect(role(first)).toHaveText(/líder/);

  const second = await context.newPage();
  await second.goto(POC);
  await expect(role(second)).toHaveText('Esta aba é seguidora e usa o banco pela aba líder.');
  await add(second);
  await expect(total(second)).toHaveText('Categorias de teste: 1');
  await first.getByRole('button', { name: 'Atualizar contagem' }).click();
  await expect(total(first)).toHaveText('Categorias de teste: 1');

  await first.close();
  await expect(role(second)).toHaveText(/líder/);
  await add(second);
  await expect(total(second)).toHaveText('Categorias de teste: 2');
});

test('app abre e o banco local funciona sem rede (RNF-PWA-02, F6)', async ({ page, context }) => {
  await page.goto('/app/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Primeira visita: a página só fica controlada depois que o SW ativa e faz clients.claim().
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('img', { name: 'Zooloo Finanças' })).toBeVisible();
  await expect(page.getByRole('status').first()).toHaveText('Offline · nenhuma alteração pendente');

  await page.goto(POC);
  await expect(role(page)).toHaveText(/líder/);
  await add(page);
  await expect(total(page)).toHaveText('Categorias de teste: 1');
});

test('Service Worker não guarda respostas da API (RNF-PWA-04)', async ({ page }) => {
  await page.goto('/app/');
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.evaluate(() => fetch('/api/v1/health').catch(() => undefined));
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      urls.push(...(await cache.keys()).map((request) => new URL(request.url).pathname));
    }
    return urls;
  });
  expect(cached.length).toBeGreaterThan(0);
  expect(cached.filter((path) => !path.startsWith('/app/'))).toEqual([]);
  expect(cached).toContain('/app/index.html');
  expect(cached.some((path) => path.endsWith('.wasm'))).toBe(true);
});

test('critérios de instalação: manifest, ícones e Service Worker no escopo /app/ (RNF-PWA-01)', async ({
  page,
  request,
}) => {
  await page.goto('/app/');
  const manifest = await (await request.get('/app/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({
    name: 'Zooloo Finanças',
    short_name: 'Zooloo',
    start_url: '/app/?source=pwa',
    scope: '/app/',
    display: 'standalone',
  });
  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const response = await request.get(icon.src);
    expect(response.status(), icon.src).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  }
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe('/app/');
});

test('apagar o banco local remove os dados (base do logout e do remote wipe, F7)', async ({
  page,
}) => {
  await page.goto(POC);
  await add(page);
  await page.getByRole('button', { name: 'Apagar banco local' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Banco local apagado.' })).toBeVisible();
  await page.reload();
  await expect(total(page)).toHaveText('Categorias de teste: 0');
});
