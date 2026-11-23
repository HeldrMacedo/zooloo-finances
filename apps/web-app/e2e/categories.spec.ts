import { type Browser, expect, type Page, test } from '@playwright/test';

/**
 * Tela de categorias (RF-CAT-01, 02 e 05) contra a API real da worktree, em dois "computadores"
 * (contextos com OPFS separados). Precisa de `pnpm dev:worktree up` (PostgreSQL com seed sintético).
 * Nomes levam carimbo de tempo: o banco da worktree acumula as execuções.
 */
test.skip(
  !process.env['ZL_E2E_API_PORT'],
  'Sem .env.worktree: rode `pnpm dev:worktree up` para testar a tela contra a API.',
);

const SCREEN = '/app/categorias';

async function openDevice(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(SCREEN);
  await expect(page.getByRole('list', { name: 'Categorias de Despesas' })).toBeVisible();
  await synced(page);
  return page;
}

async function synced(page: Page): Promise<void> {
  await expect(page.getByRole('complementary').getByRole('status')).toHaveText('Sincronizado');
}

const tree = (page: Page) => page.getByRole('list', { name: 'Categorias de Despesas' });
const row = (page: Page, name: string) =>
  page
    .locator('[data-category-id]')
    .filter({ has: page.getByRole('button', { name: `Ações de ${name}`, exact: true }) });
const dialog = (page: Page) => page.getByRole('dialog');

async function act(page: Page, name: string, item: string): Promise<void> {
  await page.getByRole('button', { name: `Ações de ${name}`, exact: true }).click();
  await page.getByRole('menuitem', { name: item, exact: true }).click();
}

async function create(page: Page, name: string, parent?: string): Promise<void> {
  if (parent) {
    await act(page, parent, 'Nova subcategoria');
  } else {
    await page.getByRole('button', { name: 'Nova categoria' }).click();
  }
  await dialog(page).getByLabel('Nome', { exact: true }).fill(name);
  await dialog(page).getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText(`Categoria "${name}" criada.`)).toBeVisible();
}

async function setParent(page: Page, name: string, parent: string): Promise<void> {
  await act(page, name, 'Editar');
  await dialog(page).getByLabel('Categoria mãe').selectOption({ label: parent });
  await dialog(page).getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText(`Categoria "${name}" salva.`)).toBeVisible();
}

/** Posição de cada nome entre as linhas visíveis, na ordem da tela. */
async function order(page: Page, names: readonly string[]): Promise<number[]> {
  const ids = await page
    .locator('[data-category-id]')
    .evaluateAll((rows) =>
      rows.map((r) => r.querySelector('button[aria-haspopup="menu"]')?.getAttribute('title')),
    );
  return names.map((name) => ids.indexOf(`Ações de ${name}`));
}

test('cria, edita, reordena, arquiva, desarquiva e exclui; outro computador recebe', async ({
  browser,
}) => {
  const stamp = Date.now();
  const parent = `E2E Casa ${stamp}`;
  const sibling = `E2E Pets ${stamp}`;
  const child = `E2E Reforma ${stamp}`;
  const a = await openDevice(browser);

  await create(a, parent);
  await create(a, sibling);
  await create(a, child, parent);
  await expect(a.getByRole('list', { name: parent })).toContainText(child);
  await synced(a);

  // Edição: renomeia e troca a cor.
  await act(a, sibling, 'Editar');
  await dialog(a).getByLabel('Nome', { exact: true }).fill(`${sibling} e Cia`);
  await dialog(a).getByTitle('Roxo').click();
  await expect(dialog(a).getByRole('radio', { name: 'Roxo' })).toBeChecked();
  await dialog(a).getByRole('button', { name: 'Salvar' }).click();
  const renamed = `${sibling} e Cia`;
  await expect(a.getByText(`Categoria "${renamed}" salva.`)).toBeVisible();

  // Reordena pelo menu e pela alça com o teclado.
  const [p0, s0] = await order(a, [parent, renamed]);
  expect(s0).toBeGreaterThan(p0 ?? -1);
  await act(a, renamed, 'Mover para cima');
  await expect
    .poll(async () => {
      const [p, s] = await order(a, [parent, renamed]);
      return (s ?? 0) < (p ?? 0);
    })
    .toBe(true);
  await a.getByRole('button', { name: `Arrastar ${renamed} para reordenar` }).press('ArrowDown');
  await expect
    .poll(async () => {
      const [p, s] = await order(a, [parent, renamed]);
      return (s ?? 0) > (p ?? 0);
    })
    .toBe(true);

  // Arquivar a mãe tira a filha junto; "Mostrar arquivadas" traz as duas de volta.
  await act(a, parent, 'Arquivar');
  await expect(row(a, parent)).toHaveCount(0);
  await expect(row(a, child)).toHaveCount(0);
  await a.getByRole('switch', { name: 'Mostrar arquivadas' }).check();
  await expect(row(a, parent)).toContainText('Arquivada');
  await expect(row(a, child)).toContainText('Arquivada');
  await act(a, parent, 'Desarquivar');
  await expect(row(a, parent)).not.toContainText('Arquivada');
  await a.getByRole('switch', { name: 'Mostrar arquivadas' }).uncheck();
  await synced(a);

  // Outro computador recebe tudo pelo sync ao abrir.
  const b = await openDevice(browser);
  await expect(b.getByRole('list', { name: parent })).toContainText(child);
  await expect(row(b, renamed)).toBeVisible();

  // Exclusão leva a filha; o outro computador vê ao sincronizar (recarregar sincroniza).
  await act(a, parent, 'Excluir');
  await expect(dialog(a)).toContainText(`1 subcategoria será excluída junto: ${child}.`);
  await dialog(a).getByRole('button', { name: 'Excluir categoria' }).click();
  await expect(a.getByText(`Categoria "${parent}" excluída.`)).toBeVisible();
  await act(a, renamed, 'Excluir');
  await dialog(a).getByRole('button', { name: 'Excluir categoria' }).click();
  await expect(row(a, renamed)).toHaveCount(0);
  await synced(a);

  await b.reload();
  await expect(tree(b)).toBeVisible();
  for (const name of [parent, child, renamed]) {
    await expect(row(b, name)).toHaveCount(0);
  }
});

test('cria sem rede, mostra a pendência e envia ao voltar (F6)', async ({ browser }) => {
  const name = `E2E Offline ${Date.now()}`;
  const a = await openDevice(browser);
  await a.context().setOffline(true);
  await create(a, name);
  await expect(a.getByRole('complementary').getByRole('status')).toHaveText(
    'Offline · 1 alteração pendente',
  );

  await a.context().setOffline(false);
  await synced(a);

  const b = await openDevice(browser);
  await expect(row(b, name)).toBeVisible();
  await act(b, name, 'Excluir');
  await dialog(b).getByRole('button', { name: 'Excluir categoria' }).click();
  await synced(b);
});

test('mudanças concorrentes que formariam 3 níveis convergem nos dois computadores', async ({
  browser,
}) => {
  const stamp = Date.now();
  const x = `E2E X ${stamp}`;
  const y = `E2E Y ${stamp}`;
  const a = await openDevice(browser);
  await create(a, x);
  await create(a, y);
  await synced(a);
  const b = await openDevice(browser);
  await expect(row(b, y)).toBeVisible();

  // Sem rede, cada um põe uma sob a outra: juntas dariam X > Y > X (RN-CAT-01).
  await a.context().setOffline(true);
  await b.context().setOffline(true);
  await setParent(a, x, y);
  await setParent(b, y, x);
  await expect(a.getByRole('list', { name: y })).toContainText(x);
  await expect(b.getByRole('list', { name: x })).toContainText(y);

  // A envia primeiro e vence; o servidor recusa a de B, que desfaz e avisa.
  await a.context().setOffline(false);
  await synced(a);
  await b.context().setOffline(false);
  await expect(b.getByRole('alert')).toContainText('1 alteração foi recusada pelo servidor');
  await synced(b);

  for (const page of [a, b]) {
    await page.reload();
    await expect(page.getByRole('list', { name: y })).toContainText(x);
    await expect(page.getByRole('list', { name: x })).toHaveCount(0);
    await synced(page);
  }

  await act(a, y, 'Excluir');
  await dialog(a).getByRole('button', { name: 'Excluir categoria' }).click();
  await synced(a);
});
