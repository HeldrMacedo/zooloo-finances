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
  await expect(
    page.getByText(
      /^VFS zooloo-sahpool, arquivo \/zooloo\.sqlite3, cifra sqlcipher \(SQLite3 Multiple Ciphers \d+\.\d+\.\d+\)/,
    ),
  ).toBeVisible();
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
  // A chave do banco some junto (SEC-CR-08): nem uma cópia antiga do arquivo abriria.
  expect(await page.evaluate(readKeyRecord)).toBe(false);
  await page.reload();
  await expect(total(page)).toHaveText('Categorias de teste: 0');
});

/** `true` se o IndexedDB ainda guarda a chave cifrada do banco local. */
function readKeyRecord(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zooloo-keys', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('keys');
    request.onerror = () => reject(request.error ?? new Error('IndexedDB'));
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction('keys').objectStore('keys').get('local-db');
      read.onsuccess = () => {
        database.close();
        resolve(read.result !== undefined);
      };
      read.onerror = () => reject(read.error ?? new Error('IndexedDB'));
    };
  });
}

/** Lê todos os arquivos do OPFS da origem (em latin1, para buscar texto em bytes crus). */
async function readOpfs(): Promise<{ files: number; bytes: number; text: string }> {
  let files = 0;
  let bytes = 0;
  let text = '';
  const walk = async (directory: FileSystemDirectoryHandle): Promise<void> => {
    for await (const handle of directory.values()) {
      if (handle.kind === 'directory') {
        await walk(handle);
      } else {
        const buffer = new Uint8Array(await (await handle.getFile()).arrayBuffer());
        files += 1;
        bytes += buffer.length;
        text += Array.from(buffer, (byte) => String.fromCharCode(byte)).join('');
      }
    }
  };
  await walk(await navigator.storage.getDirectory());
  return { files, bytes, text };
}

test('arquivo do banco no OPFS é cifrado: sem cabeçalho SQLite nem texto em claro (SEC-CR-08)', async ({
  page,
}) => {
  await page.goto(POC);
  await add(page);
  await expect(total(page)).toHaveText('Categorias de teste: 1');
  // Fecha o app (o Worker solta os arquivos) e lê o OPFS de uma página da mesma origem sem o app.
  await page.goto('/app/manifest.webmanifest');
  const opfs = await page.evaluate(readOpfs);
  expect(opfs.bytes).toBeGreaterThan(8192);
  expect(opfs.text).not.toContain('SQLite format 3');
  expect(opfs.text).not.toContain('Categoria de teste');
  expect(opfs.text).not.toContain('Perfil sint');
  expect(opfs.text).not.toContain('CREATE TABLE');
});

test('sem a chave o banco antigo não abre: é recriado vazio e avisado (SEC-CR-08)', async ({
  page,
}) => {
  await page.goto(POC);
  await add(page);
  await page.goto('/app/manifest.webmanifest');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('zooloo-keys');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('IndexedDB'));
      }),
  );
  await page.goto(POC);
  await expect(
    page.getByText(/Recriado: não havia chave que abrisse o banco anterior/),
  ).toBeVisible();
  await expect(total(page)).toHaveText('Categorias de teste: 0');
});

test('mede banco cifrado e cifra por campo (PoC 3, ADR-0008)', async ({ page }, testInfo) => {
  await page.goto(POC);
  await page.getByRole('button', { name: 'Medir cifras' }).click();
  const result = page.getByText(/^2000 linhas: sem cifra \d+ ms/);
  await expect(result).toBeVisible({ timeout: 60_000 });
  testInfo.annotations.push({ type: 'medição', description: (await result.textContent()) ?? '' });
});
