# Site público e lista de espera — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar `apps/site` (Next.js) com landing, página do beta com lista de espera, termos e privacidade, gravando a lista pela `apps/api` no PostgreSQL com RLS e rate limit.

**Architecture:** O site é um servidor Next.js 16 (`output: "standalone"`) com CSP por nonce gerada no `proxy.ts`; o formulário usa Server Action que chama `POST /api/v1/waitlist` com `SITE_API_KEY` e o IP do visitante. A API valida com Zod, aplica rate limit por porta `RateLimiter` (Redis em dev/produção, memória em teste) e grava em `waitlist_entries`, onde `zooloo_app` só tem `INSERT`. Logo e gerador de CSS de tokens passam a ser compartilhados pelo web-app e pelo site.

**Tech Stack:** Next.js 16.4.6, React 19.3.1, NestJS 12 + Fastify 5, Drizzle 0.45, PostgreSQL 17, Redis 7 (`redis` 6.4.0), Zod 4, Vitest 5, Playwright 1.65, Testcontainers.

**Spec:** `docs/superpowers/specs/2026-11-23-site-publico-design.md`

## Global Constraints

- Node 24+ e pnpm via corepack. No Bash deste ambiente: `export PATH="/c/Users/Israel/AppData/Local/nvm/v24.22.3:$PATH"` antes de `pnpm`/`npx`; Docker CLI fora do PATH: `export PATH="$LOCALAPPDATA/Programs/DockerDesktop/resources/bin:$PATH"` (ou o caminho registrado na memória) antes de testes com Testcontainers.
- Só dados sintéticos (`@example.test`, IPs de documentação `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`).
- Toda entrada externa validada com Zod; campos desconhecidos recusados (`z.strictObject`).
- Logs só por `@zooloo/security`; `console.*` é erro de lint. E-mail nunca em log, nem mascarado.
- `new Date()` proibido fora de adaptadores; relógio da API só por `providers/clock.ts`.
- Apps não importam código de outro app; compartilhar por `packages/`.
- Toda tabela com RLS ativa e forçada.
- `POST /api/v1/waitlist` responde **sempre 202** com `{ "status": "accepted" }` para e-mail novo, repetido ou honeypot.
- Rate limit: **5 por hora por IP do visitante** e **120 por minuto no total da chave do site**; excedido: 429 problem+json com `Retry-After`. Redis fora: 503.
- `SITE_API_KEY`: mínimo 32 caracteres; comparação com `timingSafeEqual`. `X-Client-Ip` só é lido com a chave válida.
- E-mail: trim, minúsculas, até 254 caracteres. Tabela sem IP nem user agent.
- CSP sem `unsafe-inline` em `script-src`; sem analytics nem scripts de terceiros.
- Textos em pt-BR. Termos e privacidade com a faixa "Versão preliminar — revisão jurídica pendente".
- Não alterar `.github/workflows/`, limites de cobertura nem regras de segurança. E2E do site no CI fica como pendência para revisão humana.
- `pnpm check` verde ao fim de cada tarefa que toca código.

## Desvios da spec (decididos neste plano)

1. **Gerador de CSS dos tokens vai para `@zooloo/ui-tokens`, não para `@zooloo/ui-web`.** O `vite.config.ts` do web-app e o script do site rodam em Node e importam o `dist/` do pacote; `@zooloo/ui-web` exporta só `src/` (TSX + CSS Modules, consumido por bundlers). É uma função pura que devolve string, inofensiva para o mobile.
2. **IP do visitante = entrada de `X-Forwarded-For` contada da direita por `TRUSTED_PROXY_HOPS` (padrão 1), não a primeira.** A primeira entrada é escrita pelo cliente e permite burlar o limite por IP. Registrado no ADR-0009.
3. **Textos jurídicos longos ficam em `apps/site/src/content/`**, não no catálogo de `@zooloo/i18n`; o catálogo recebe só textos de interface (`site.*`).
4. **Todas as páginas do site são renderizadas por requisição** (exigência do nonce de CSP no Next.js 16). A spec já previa a exceção.

## Review Focus

- E-mail com maiúsculas/espaços repetido (`Ana@Example.test ` depois de `ana@example.test`) não duplica e devolve o mesmo 202 — teste na Task 5 (banco) e Task 8 (API).
- Envio sem JavaScript (form HTML puro) grava e mostra a confirmação — teste E2E na Task 13.
- Cliente forjando `X-Forwarded-For: 1.1.1.1, <ip real>` não escapa do limite por IP — teste na Task 11 (`clientIpFrom`).
- `X-Client-Ip` enviado sem a chave do site é ignorado (não muda o balde do limite) — teste na Task 8.
- Duas abas enviando o mesmo e-mail ao mesmo tempo não geram 500 (conflito vira `DO NOTHING`) — teste na Task 8 (`Promise.all`).

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `packages/ui-tokens/src/css.ts` | `tokensCss()`: CSS das variáveis `--zl-*` |
| `packages/ui-web/` | Pacote React web: `<ZoolooLogo>` |
| `packages/validation/src/waitlist.ts` | `WaitlistSignupSchema`, `WaitlistAcceptedSchema`, `PRIVACY_VERSION_PATTERN` |
| `packages/i18n/src/messages/pt-BR.ts` | Namespace `site` |
| `packages/db-schema/src/pg/waitlist.ts` | Tabela `waitlist_entries` e política só de `INSERT` |
| `apps/api/src/providers/ids.ts` | `newId()` UUIDv7 |
| `apps/api/src/providers/rate-limit/*` | Porta `RateLimiter`, memória, Redis, módulo |
| `apps/api/src/modules/waitlist/*` | Guard da chave do site, controller, service, repo |
| `apps/site/` | Next.js: páginas, Server Action, CSP |
| `tools/dev-worktree/src/*` | Porta e comando `site`, `SITE_API_KEY` no `.env.worktree` |
| `docs/design-docs/adr-0009-site-publico.md` | Decisões do site |

---

### Task 1: `tokensCss` em `@zooloo/ui-tokens`

**Files:**
- Create: `packages/ui-tokens/src/css.ts`
- Create: `packages/ui-tokens/src/css.test.ts`
- Modify: `packages/ui-tokens/src/index.ts`
- Modify: `apps/web-app/build/tokens-css.ts`
- Modify: `apps/web-app/build/tokens-css.test.ts`

**Interfaces:**
- Produces: `tokensCss(): string` exportado de `@zooloo/ui-tokens`.

- [ ] **Step 1: Mover os testes de `tokensCss` para o pacote**

`packages/ui-tokens/src/css.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { tokensCss } from './css.js';
import { darkTheme, lightTheme } from './themes.js';
import { chartSequence, chartSequenceDark } from './tokens.js';

describe('tokensCss', () => {
  const css = tokensCss();

  it('tema claro em :root e escuro por atributo e por preferência do sistema', () => {
    expect(css).toContain(`--zl-background: ${lightTheme.background};`);
    expect(css).toContain(`:root[data-theme='dark'] {`);
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(':root:not([data-theme])');
    expect(css.split(`--zl-background: ${darkTheme.background};`)).toHaveLength(3);
  });

  it('cores de gráfico por tema', () => {
    expect(css).toContain(`--zl-chart-1: ${chartSequence[0]};`);
    expect(css.split(`--zl-chart-1: ${chartSequenceDark[0]};`)).toHaveLength(3);
  });

  it('fontes, raios, escala e cores da marca', () => {
    expect(css).toContain("--zl-font-display: 'Plus Jakarta Sans Variable'");
    expect(css).toContain("--zl-font-ui: 'Inter Variable'");
    expect(css).toContain('--zl-radius-lg: 16px;');
    expect(css).toContain('--zl-text-md: 1rem;');
    expect(css).toContain('--zl-brand-teal: #2D6E85;');
    // Tokens compostos (income/expense) ficam só nos temas.
    expect(css).not.toContain('--zl-brand-income');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @zooloo/ui-tokens test`
Expected: FAIL — `Cannot find module './css.js'`.

- [ ] **Step 3: Criar `packages/ui-tokens/src/css.ts`**

Conteúdo = função `tokensCss` e helper `indent` copiados de `apps/web-app/build/tokens-css.ts` (linhas 1–45), trocando os imports por:

```ts
import { darkTheme, lightTheme, themeToCssVariables } from './themes.js';
import { chartSequence, chartSequenceDark, color, font, fontSize, radius } from './tokens.js';
```

e o comentário da função por:

```ts
/**
 * CSS das variáveis `--zl-*` (doc 13 §6) para apps web: folha estática, sem estilo inline (CSP).
 * Tema claro em `:root`, escuro em `[data-theme='dark']` e, sem escolha explícita, pela
 * preferência do sistema. Consumido pelo plugin do Vite do web-app e pelo script do site.
 */
```

Em `packages/ui-tokens/src/index.ts` adicionar `export * from './css.js';` (ordem alfabética, antes de `./pairs.js`).

- [ ] **Step 4: Web-app passa a usar o pacote**

`apps/web-app/build/tokens-css.ts` fica só com o plugin:

```ts
import { tokensCss } from '@zooloo/ui-tokens';

export const TOKENS_MODULE_ID = 'virtual:zooloo-tokens.css';

/** Plugin do Vite que expõe `import 'virtual:zooloo-tokens.css'` com o CSS de `@zooloo/ui-tokens`. */
export function zoolooTokensPlugin() {
  const resolved = `\0${TOKENS_MODULE_ID}`;
  return {
    name: 'zooloo-tokens',
    resolveId: (id: string) => (id === TOKENS_MODULE_ID ? resolved : undefined),
    load: (id: string) => (id === resolved ? tokensCss() : undefined),
  };
}
```

`apps/web-app/build/tokens-css.test.ts` fica só com o `describe('zoolooTokensPlugin')`, importando `tokensCss` de `@zooloo/ui-tokens` e `TOKENS_MODULE_ID, zoolooTokensPlugin` de `./tokens-css.ts`.

- [ ] **Step 5: Verificar**

Run: `pnpm --filter @zooloo/ui-tokens build && pnpm --filter @zooloo/ui-tokens test:coverage && pnpm --filter @zooloo/web-app test && pnpm --filter @zooloo/web-app build`
Expected: PASS; cobertura de ui-tokens ≥ 90%; build do web-app sem erro.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-tokens apps/web-app/build
git commit -m "refactor(ui-tokens): move tokens CSS generator into the package"
```

---

### Task 2: Pacote `@zooloo/ui-web` com `<ZoolooLogo>`

**Files:**
- Create: `packages/ui-web/package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/css-modules.d.ts`, `src/testing/setup.ts`, `src/brand/ZoolooLogo.test.tsx`
- Move: `apps/web-app/src/ui/brand/ZoolooLogo.tsx` → `packages/ui-web/src/brand/ZoolooLogo.tsx`; idem `ZoolooLogo.module.css`
- Modify: `apps/web-app/package.json`, `apps/web-app/src/app/shell/Sidebar.tsx`, `apps/web-app/src/ui/components.test.tsx`, `apps/web-app/vitest.config.ts`, `eslint.config.mjs`

**Interfaces:**
- Produces: `import { ZoolooLogo, type ZoolooLogoProps } from '@zooloo/ui-web'` (props `variant?: 'horizontal' | 'mark'`, `tagline?: string`).

- [ ] **Step 1: Criar o pacote**

`packages/ui-web/package.json`:

```json
{
  "name": "@zooloo/ui-web",
  "version": "0.0.0",
  "private": true,
  "description": "Componentes React compartilhados pelos apps web (web-app e site): marca provisória.",
  "type": "module",
  "exports": {
    ".": {
      "@zooloo/source": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@zooloo/i18n": "workspace:*",
    "@zooloo/ui-tokens": "workspace:*"
  },
  "peerDependencies": {
    "react": "19.3.1"
  },
  "devDependencies": {
    "@testing-library/react": "16.3.3",
    "@types/react": "19.3.0",
    "@vitejs/plugin-react": "6.3.0",
    "@vitest/coverage-v8": "5.1.0",
    "@zooloo/vitest-config": "workspace:*",
    "axe-core": "4.14.1",
    "jsdom": "31.0.1",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "typescript": "6.0.3",
    "vitest": "5.1.0"
  }
}
```

Sem `build`: o pacote só é consumido por bundlers (Vite e Next.js), que compilam o `src/` (ADR-0009).

`packages/ui-web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "noEmit": true,
    "declaration": false,
    "types": []
  },
  "include": ["src"]
}
```

`packages/ui-web/src/css-modules.d.ts`:

```ts
// Bundlers (Vite, Next.js) resolvem CSS Modules; aqui só o tipo.
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
```

`packages/ui-web/vitest.config.ts`:

```ts
import { packageTestConfig, UI_THRESHOLDS } from '@zooloo/vitest-config';
import react from '@vitejs/plugin-react';
import { mergeConfig } from 'vitest/config';

// UI Web: RNF-QA-05 (≥ 70%, axe).
export default mergeConfig(packageTestConfig(UI_THRESHOLDS), {
  plugins: [react()],
  resolve: { conditions: ['@zooloo/source', 'module', 'browser', 'development|production'] },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/testing/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/index.ts', 'src/testing/**', 'src/**/*.d.ts'],
    },
  },
});
```

`packages/ui-web/src/testing/setup.ts`:

```ts
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 2: Escrever o teste do logo no pacote**

`packages/ui-web/src/brand/ZoolooLogo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ZoolooLogo } from './ZoolooLogo.js';

describe('ZoolooLogo', () => {
  it('horizontal e só símbolo têm o nome acessível da marca', () => {
    render(
      <>
        <ZoolooLogo />
        <ZoolooLogo variant="mark" />
      </>,
    );
    expect(screen.getAllByRole('img', { name: 'Zooloo Finanças' })).toHaveLength(2);
  });

  it('mostra a linha de apoio quando informada', () => {
    const { container } = render(<ZoolooLogo tagline="Controle inteligente" />);
    expect(container.textContent).toContain('Controle inteligente');
  });

  it('sem violações axe', async () => {
    const { container } = render(
      <main>
        <ZoolooLogo />
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm install && pnpm --filter @zooloo/ui-web test`
Expected: FAIL — `Cannot find module './ZoolooLogo.js'`.

- [ ] **Step 4: Mover o componente**

```bash
git mv apps/web-app/src/ui/brand/ZoolooLogo.tsx packages/ui-web/src/brand/ZoolooLogo.tsx
git mv apps/web-app/src/ui/brand/ZoolooLogo.module.css packages/ui-web/src/brand/ZoolooLogo.module.css
```

`packages/ui-web/src/index.ts`:

```ts
export * from './brand/ZoolooLogo.js';
```

- [ ] **Step 5: Web-app consome o pacote**

- `apps/web-app/package.json`: adicionar `"@zooloo/ui-web": "workspace:*"` em `dependencies` (ordem alfabética).
- `apps/web-app/src/app/shell/Sidebar.tsx` e `apps/web-app/src/ui/components.test.tsx`: trocar `import { ZoolooLogo } from '.../brand/ZoolooLogo.js'` por `import { ZoolooLogo } from '@zooloo/ui-web';`.
- `apps/web-app/src/ui/components.test.tsx`: apagar o `describe('ZoolooLogo', …)` (agora no pacote); manter `<ZoolooLogo />` no teste de axe.
- `grep -rn "brand/ZoolooLogo" apps/web-app/src` deve voltar vazio.
- `eslint.config.mjs`: nos três blocos com `files: ['apps/web-app/src/**/*.tsx']` / `{ts,tsx}`, incluir `'packages/ui-web/src/**/*.tsx'` (react-hooks, jsx-a11y e globais de navegador).

- [ ] **Step 6: Verificar**

Run: `pnpm install && pnpm --filter @zooloo/ui-web test:coverage && pnpm --filter @zooloo/ui-web typecheck && pnpm --filter @zooloo/web-app test && pnpm --filter @zooloo/web-app build && pnpm lint && pnpm depcruise`
Expected: tudo PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-web apps/web-app eslint.config.mjs pnpm-lock.yaml
git commit -m "feat(ui-web): shared web package with provisional ZoolooLogo"
```

---

### Task 3: `WaitlistSignupSchema` em `@zooloo/validation`

**Files:**
- Create: `packages/validation/src/waitlist.ts`, `packages/validation/src/waitlist.test.ts`
- Modify: `packages/validation/src/index.ts`

**Interfaces:**
- Produces:
  - `WaitlistSignupSchema` (Zod) → `WaitlistSignup = { email: string; privacyAccepted: true; marketingOptIn: boolean; privacyVersion: string; website?: string }`
  - `WaitlistAcceptedSchema` → `{ status: 'accepted' }`
  - `EMAIL_MAX_LENGTH = 254`

- [ ] **Step 1: Teste**

`packages/validation/src/waitlist.test.ts`:

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EMAIL_MAX_LENGTH, WaitlistAcceptedSchema, WaitlistSignupSchema } from './waitlist.js';

const valid = {
  email: 'ana@example.test',
  privacyAccepted: true,
  marketingOptIn: false,
  privacyVersion: '2026-11-23',
};

describe('WaitlistSignupSchema', () => {
  it('normaliza o e-mail: sem espaços nas pontas e em minúsculas', () => {
    const parsed = WaitlistSignupSchema.parse({ ...valid, email: '  Ana@Example.TEST ' });
    expect(parsed.email).toBe('ana@example.test');
  });

  it('marketing é opt-in: ausente vira false', () => {
    const { marketingOptIn: _, ...rest } = valid;
    expect(WaitlistSignupSchema.parse(rest).marketingOptIn).toBe(false);
  });

  it('exige aceite da política', () => {
    expect(WaitlistSignupSchema.safeParse({ ...valid, privacyAccepted: false }).success).toBe(false);
    const { privacyAccepted: _, ...rest } = valid;
    expect(WaitlistSignupSchema.safeParse(rest).success).toBe(false);
  });

  it('recusa e-mail inválido ou longo demais', () => {
    expect(WaitlistSignupSchema.safeParse({ ...valid, email: 'ana' }).success).toBe(false);
    const long = `${'a'.repeat(EMAIL_MAX_LENGTH - 12)}@example.test`;
    expect(long.length).toBeGreaterThan(EMAIL_MAX_LENGTH);
    expect(WaitlistSignupSchema.safeParse({ ...valid, email: long }).success).toBe(false);
  });

  it('versão da política em YYYY-MM-DD', () => {
    expect(WaitlistSignupSchema.safeParse({ ...valid, privacyVersion: 'v1' }).success).toBe(false);
  });

  it('honeypot é opcional e limitado', () => {
    expect(WaitlistSignupSchema.parse({ ...valid, website: 'x' }).website).toBe('x');
    expect(WaitlistSignupSchema.safeParse({ ...valid, website: 'x'.repeat(201) }).success).toBe(
      false,
    );
  });

  it('recusa campos desconhecidos (mass assignment)', () => {
    expect(WaitlistSignupSchema.safeParse({ ...valid, admin: true }).success).toBe(false);
  });

  it('propriedade: e-mail aceito é sempre minúsculo, sem espaços e dentro do limite', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const result = WaitlistSignupSchema.safeParse({ ...valid, email: ` ${email.toUpperCase()}` });
        if (result.success) {
          expect(result.data.email).toBe(result.data.email.trim().toLowerCase());
          expect(result.data.email.length).toBeLessThanOrEqual(EMAIL_MAX_LENGTH);
        }
      }),
    );
  });
});

describe('WaitlistAcceptedSchema', () => {
  it('só aceita o corpo neutro', () => {
    expect(WaitlistAcceptedSchema.parse({ status: 'accepted' })).toEqual({ status: 'accepted' });
    expect(WaitlistAcceptedSchema.safeParse({ status: 'duplicate' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @zooloo/validation test`
Expected: FAIL — `Cannot find module './waitlist.js'`.

- [ ] **Step 3: Implementar**

`packages/validation/src/waitlist.ts`:

```ts
import * as z from 'zod';

/** Limite prático de endereço de e-mail (RFC 5321). */
export const EMAIL_MAX_LENGTH = 254;

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, `E-mail pode ter até ${EMAIL_MAX_LENGTH} caracteres.`)
  .pipe(z.email({ error: 'Informe um e-mail válido.' }));

/**
 * Inscrição na lista de espera do beta (doc 11 §4.3). Marketing é opt-in separado (RNF-LGPD-05).
 * `website` é honeypot: pessoas não veem o campo; preenchido, a API responde igual e não grava.
 */
export const WaitlistSignupSchema = z.strictObject({
  email: EmailSchema,
  privacyAccepted: z.literal(true, { error: 'Aceite a política de privacidade para continuar.' }),
  marketingOptIn: z.boolean().default(false),
  privacyVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Versão da política inválida.'),
  website: z.string().max(200).optional(),
});

export type WaitlistSignup = z.infer<typeof WaitlistSignupSchema>;

/** Resposta única do cadastro: não revela se o e-mail já estava na lista (SEC-ID-07). */
export const WaitlistAcceptedSchema = z.strictObject({ status: z.literal('accepted') });

export type WaitlistAccepted = z.infer<typeof WaitlistAcceptedSchema>;
```

`packages/validation/src/index.ts`: adicionar `export * from './waitlist.js';` ao fim.

- [ ] **Step 4: Verificar**

Run: `pnpm --filter @zooloo/validation test:coverage`
Expected: PASS, cobertura nos limites.

- [ ] **Step 5: Commit**

```bash
git add packages/validation
git commit -m "feat(validation): waitlist signup schema"
```

---

### Task 4: Textos do site em `@zooloo/i18n`

**Files:**
- Modify: `packages/i18n/src/messages/pt-BR.ts`
- Modify: `packages/i18n/src/translate.test.ts` (ou o teste do catálogo existente)

**Interfaces:**
- Produces: chaves `site.*` listadas abaixo, usadas pelas Tasks 9–11 via `t('site.…')`.

- [ ] **Step 1: Teste**

Adicionar ao teste do catálogo (`packages/i18n/src/translate.test.ts`):

```ts
import { t } from './index.js';

describe('textos do site', () => {
  it('confirmação da lista de espera é neutra (não revela cadastro anterior)', () => {
    expect(t('site.waitlist.accepted')).toBe('Pronto! Avisaremos quando sua vaga abrir.');
  });

  it('aviso dos documentos preliminares', () => {
    expect(t('site.legal.draftBanner')).toBe('Versão preliminar — revisão jurídica pendente.');
  });
});
```

(Se o arquivo não importar `describe`/`expect`/`it`, incluir `import { describe, expect, it } from 'vitest';`.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @zooloo/i18n test`
Expected: FAIL — erro de tipo/chave `site.waitlist.accepted` inexistente.

- [ ] **Step 3: Adicionar o namespace `site`** em `ptBR`, depois de `amount`:

```ts
  site: {
    nav: {
      label: 'Navegação principal',
      skip: 'Pular para o conteúdo',
      home: 'Início',
      beta: 'Beta',
      terms: 'Termos de uso',
      privacy: 'Privacidade',
    },
    hero: {
      title: 'Suas finanças em ordem, mesmo sem internet.',
      lead: 'O Zooloo Finanças organiza contas, cartões e orçamentos da família direto no navegador, com seus dados cifrados no dispositivo.',
      cta: 'Quero participar do beta',
    },
    features: {
      title: 'Por que o Zooloo',
      offline: {
        title: 'Funciona offline',
        body: 'Lance despesas no ônibus ou no mercado; tudo sincroniza quando a conexão voltar.',
      },
      privacy: {
        title: 'Privacidade por padrão',
        body: 'Banco local cifrado, dados no Brasil e nada de anúncios ou rastreadores.',
      },
      web: {
        title: 'Instale pelo navegador',
        body: 'Use no computador ou no celular como aplicativo, sem loja.',
      },
      family: {
        title: 'Feito para a família',
        body: 'Perfis separados para organizar o dinheiro de cada um no mesmo lugar.',
      },
    },
    waitlist: {
      title: 'Entre na lista do beta',
      lead: 'Estamos abrindo vagas aos poucos. Deixe seu e-mail e avisaremos quando chegar a sua vez.',
      email: 'E-mail',
      privacyConsent: 'Li e aceito a política de privacidade',
      marketingConsent: 'Quero receber novidades do Zooloo por e-mail (opcional)',
      submit: 'Entrar na lista',
      submitting: 'Enviando…',
      accepted: 'Pronto! Avisaremos quando sua vaga abrir.',
      rateLimited: 'Muitas tentativas. Tente de novo mais tarde.',
      failed: 'Não foi possível enviar agora. Tente de novo em alguns minutos.',
      honeypot: 'Deixe este campo vazio',
    },
    legal: {
      draftBanner: 'Versão preliminar — revisão jurídica pendente.',
      version: 'Versão de {date}',
    },
    footer: {
      rights: 'Zooloo Finanças. Dados sintéticos em ambientes de teste.',
      legal: 'Documentos legais',
    },
    notFound: {
      title: 'Página não encontrada',
      back: 'Voltar ao início',
    },
    error: {
      title: 'Algo deu errado',
      retry: 'Tentar de novo',
    },
  },
```

- [ ] **Step 4: Verificar**

Run: `pnpm --filter @zooloo/i18n test:coverage && pnpm --filter @zooloo/i18n build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/i18n
git commit -m "feat(i18n): public site texts"
```

---

### Task 5: Tabela `waitlist_entries` (risco alto — revisão humana)

**Files:**
- Create: `packages/db-schema/src/pg/waitlist.ts`
- Modify: `packages/db-schema/src/pg/index.ts`, `packages/db-schema/src/pg/rls.test.ts`
- Create (gerados): `packages/db-schema/migrations/pg/0004_*.sql`, `0005_waitlist_rls_and_grants.sql`, `migrations/pg/meta/*`

**Interfaces:**
- Produces: `waitlistEntries` (Drizzle `pgTable`) com colunas `id`, `email`, `marketingOptIn`, `privacyVersion`, `createdAt`; `zooloo_app` só `INSERT`.

- [ ] **Step 1: Testes estruturais e de comportamento**

Em `packages/db-schema/src/pg/rls.test.ts`:

1. Depois de `tableNames`, adicionar:

```ts
/** Tabelas sem titular: a aplicação só insere e nunca lê (lista de espera, ADR-0009). */
const INSERT_ONLY_TABLES = ['waitlist_entries'];
```

2. Em `'o esquema Drizzle declara as tabelas esperadas'`: esperar `['categories', 'profiles', 'sync_state', 'users', 'waitlist_entries']`.

3. No laço de `'toda tabela tem RLS ativa e forçada…'`, trocar a expectativa de comandos por:

```ts
      const expected = INSERT_ONLY_TABLES.includes(row.relname)
        ? ['INSERT']
        : ['DELETE', 'INSERT', 'SELECT', 'UPDATE'];
      expect([...row.commands].sort(), `políticas de ${row.relname}`).toEqual(expected);
```

4. Em `'toda política vale só para zooloo_app e compara com app.user_id'`:

```ts
    const ownerTables = tableNames.length - INSERT_ONLY_TABLES.length;
    expect(rows.length).toBe(ownerTables * 4 + INSERT_ONLY_TABLES.length);
    for (const row of rows) {
      expect(row.roles, row.tablename).toEqual(['zooloo_app']);
      if (INSERT_ONLY_TABLES.includes(row.tablename)) {
        expect(row.expr, row.tablename).toBe('true');
      } else {
        expect(row.expr, row.tablename).toContain("current_setting('app.user_id'::text, true)");
      }
    }
```

5. Novo `describe` ao fim do arquivo:

```ts
describe('lista de espera (waitlist_entries)', () => {
  const insert = (client: pg.PoolClient, id: string, email: string) =>
    client.query(
      `insert into waitlist_entries (id, email, marketing_opt_in, privacy_version)
       values ($1, $2, false, '2026-11-23') on conflict do nothing`,
      [id, email],
    );

  it('a aplicação insere sem contexto de usuário', async () => {
    await asUser(db.app, null, (client) =>
      insert(client, '0196f3a2-0000-7000-8000-0000000000f1', 'lista@example.test'),
    );
    const { rows } = await db.owner.query<{ n: string }>(
      `select count(*)::text as n from waitlist_entries where email = 'lista@example.test'`,
    );
    expect(rows[0]?.n).toBe('1');
  });

  it('e-mail repetido com outra caixa não duplica nem falha', async () => {
    await asUser(db.app, null, (client) =>
      insert(client, '0196f3a2-0000-7000-8000-0000000000f2', 'Lista@Example.test'),
    );
    const { rows } = await db.owner.query<{ n: string }>(
      `select count(*)::text as n from waitlist_entries where lower(email) = 'lista@example.test'`,
    );
    expect(rows[0]?.n).toBe('1');
  });

  it('a aplicação não lê, não altera e não apaga a lista', async () => {
    for (const statement of [
      'select email from waitlist_entries',
      `update waitlist_entries set marketing_opt_in = true`,
      'delete from waitlist_entries',
    ]) {
      await expect(
        asUser(db.app, null, (client) => client.query(statement)),
        statement,
      ).rejects.toMatchObject({ code: '42501' });
    }
  });
});
```

Adicionar `import type pg from 'pg';` no topo se ainda não existir.

- [ ] **Step 2: Rodar e ver falhar** (Docker rodando)

Run: `pnpm --filter @zooloo/db-schema test`
Expected: FAIL — lista de tabelas sem `waitlist_entries` e `relation "waitlist_entries" does not exist`.

- [ ] **Step 3: Esquema**

`packages/db-schema/src/pg/waitlist.ts`:

```ts
import { sql } from 'drizzle-orm';
import { boolean, pgPolicy, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { timestamptz } from './columns.js';
import { appRole } from './rls.js';

/**
 * Lista de espera do beta (doc 11 §4.3). Sem titular: a API grava sem `app.user_id` e o papel da
 * aplicação só tem INSERT, nunca lê a lista (ADR-0009). Minimização: sem IP nem user agent.
 */
export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    marketingOptIn: boolean('marketing_opt_in').notNull(),
    privacyVersion: text('privacy_version').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('waitlist_entries_email_unique').on(sql`lower(${table.email})`),
    pgPolicy('waitlist_insert', { for: 'insert', to: appRole, withCheck: sql`true` }),
  ],
).enableRLS();
```

`packages/db-schema/src/pg/index.ts`: adicionar `export * from './waitlist.js';` depois de `./users.js`.

- [ ] **Step 4: Gerar migrações**

```bash
pnpm --filter @zooloo/db-schema build
pnpm --filter @zooloo/db-schema db:generate
pnpm --filter @zooloo/db-schema exec drizzle-kit generate --custom --config drizzle.pg.config.ts --name waitlist_rls_and_grants
```

Conferir que o SQL gerado `0004_*.sql` cria a tabela, o índice `lower("email")`, `ENABLE ROW LEVEL SECURITY` e a política `waitlist_insert ... WITH CHECK (true)`; e que `migrations/sqlite` não mudou.

Escrever em `packages/db-schema/migrations/pg/0005_waitlist_rls_and_grants.sql`:

```sql
-- RLS forçada e grant só de inserção: a aplicação grava a lista de espera e nunca a lê (ADR-0009).
ALTER TABLE "waitlist_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT INSERT ON "waitlist_entries" TO zooloo_app;
```

- [ ] **Step 5: Verificar**

Run: `pnpm --filter @zooloo/db-schema test:coverage`
Expected: PASS. Se o `ON CONFLICT DO NOTHING` falhar por falta de `SELECT` (código `42501`), parar e reportar: a decisão D5 depende disso.

- [ ] **Step 6: Commit**

```bash
git add packages/db-schema
git commit -m "feat(db-schema): insert-only waitlist_entries table with forced RLS"
```

---

### Task 6: Suporte da API — `Retry-After`, UUIDv7 e transação sem titular

**Files:**
- Modify: `apps/api/src/runtime/http/problem.ts`, `apps/api/src/runtime/http/problem.filter.ts`, `apps/api/src/runtime/http/problem.test.ts`
- Create: `apps/api/src/providers/ids.ts`, `apps/api/src/providers/ids.test.ts`
- Modify: `apps/api/src/providers/database/database.service.ts`

**Interfaces:**
- Produces:
  - `new ProblemException(problem, headers?: Readonly<Record<string, string>>)`; o filtro envia esses cabeçalhos.
  - `newId(now?: number, random?: Uint8Array): string` (UUIDv7).
  - `DatabaseService.withoutUser<T>(work: (tx: Tx) => Promise<T>): Promise<T>`.

- [ ] **Step 1: Testes**

`apps/api/src/providers/ids.test.ts`:

```ts
import { IdSchema } from '@zooloo/validation';
import { describe, expect, it } from 'vitest';
import { newId } from './ids.js';

describe('newId', () => {
  it('gera UUIDv7 válido com o tempo nos 48 bits iniciais', () => {
    const id = newId(0x0196f3a20000, new Uint8Array(10));
    expect(IdSchema.safeParse(id).success).toBe(true);
    expect(id.startsWith('0196f3a2-0000-7')).toBe(true);
  });

  it('ids gerados em sequência ordenam por tempo', () => {
    expect(newId(1_000) < newId(2_000)).toBe(true);
  });
});
```

Em `apps/api/src/runtime/http/problem.test.ts`, adicionar:

```ts
describe('ProblemException', () => {
  it('carrega cabeçalhos extras, vazios por padrão', () => {
    expect(new ProblemException(problemForStatus(400)).headers).toEqual({});
    const limited = new ProblemException(problemForStatus(429), { 'retry-after': '60' });
    expect(limited.headers).toEqual({ 'retry-after': '60' });
  });
});
```

(importando `ProblemException` e `problemForStatus` de `./problem.js` se ainda não estiverem).

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @zooloo/api exec vitest run src/providers/ids.test.ts src/runtime/http/problem.test.ts`
Expected: FAIL — módulo `./ids.js` inexistente e `headers` undefined.

- [ ] **Step 3: Implementar**

`apps/api/src/providers/ids.ts`:

```ts
import { randomFillSync } from 'node:crypto';
import { currentWallMs } from './clock.js';

/**
 * UUIDv7 gerado no servidor (RFC 9562): 48 bits de milissegundos + versão 7 + variante + aleatório.
 * Mesmo formato do cliente (`apps/web-app/src/data/ids.ts`, RNF-SYN-02).
 */
export function newId(
  now: number = currentWallMs(),
  random: Uint8Array = randomFillSync(new Uint8Array(10)),
): string {
  const bytes = new Uint8Array(16);
  let time = now;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes.set(random, 6);
  bytes[6] = 0x70 | ((bytes[6] ?? 0) & 0x0f);
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

`apps/api/src/runtime/http/problem.ts`, classe:

```ts
/** Erro HTTP que já carrega o corpo RFC 9457 e, se preciso, cabeçalhos (ex.: `Retry-After`). */
export class ProblemException extends Error {
  override readonly name = 'ProblemException';

  constructor(
    readonly problem: Problem,
    readonly headers: Readonly<Record<string, string>> = {},
  ) {
    super(problem.title);
  }
}
```

`apps/api/src/runtime/http/problem.filter.ts`, antes do `void reply…`:

```ts
    if (exception instanceof ProblemException) {
      for (const [name, value] of Object.entries(exception.headers)) {
        void reply.header(name, value);
      }
    }
```

`apps/api/src/providers/database/database.service.ts`, depois de `withUser`:

```ts
  /**
   * Transação sem usuário: só passa nas políticas que não dependem de `app.user_id` (hoje, o INSERT
   * da lista de espera). Nenhuma linha de titular fica visível (ADR-0005, ADR-0009).
   */
  withoutUser<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }
```

- [ ] **Step 4: Verificar**

Run: `pnpm --filter @zooloo/api test`
Expected: PASS (inclui testes de integração existentes; Docker rodando).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): problem headers, server UUIDv7 and transaction without user"
```

---

### Task 7: Porta `RateLimiter` (memória e Redis) e novo env

**Files:**
- Create: `apps/api/src/providers/rate-limit/rate-limiter.ts`, `memory-rate-limiter.ts`, `redis-rate-limiter.ts`, `rate-limit.module.ts`, `rate-limiter.test.ts`, `redis-rate-limiter.test.ts`
- Modify: `apps/api/src/config/env.ts`, `apps/api/src/config/env.test.ts`, `apps/api/src/config/tokens.ts`, `apps/api/src/app.module.ts`, `apps/api/src/testing/test-app.ts`, `apps/api/package.json`

**Interfaces:**
- Produces:
  - `interface RateLimiter { hit(key: string, rule: RateRule): Promise<RateDecision> }`
  - `interface RateRule { readonly limit: number; readonly windowSeconds: number }`
  - `interface RateDecision { readonly allowed: boolean; readonly retryAfterSeconds: number }`
  - `class MemoryRateLimiter implements RateLimiter` (`constructor(now: () => number = currentWallMs)`)
  - `class RedisRateLimiter implements RateLimiter` (`constructor(client: RedisCounter)`)
  - Token `RATE_LIMITER` em `config/tokens.ts`.
  - `Env.REDIS_URL?: string`, `Env.SITE_API_KEY?: string`.

- [ ] **Step 1: Dependências**

```bash
pnpm --filter @zooloo/api add redis@6.4.0
pnpm --filter @zooloo/api add -D testcontainers@<mesma versão usada por @testcontainers/postgresql no lockfile>
```

(Ver a versão com `pnpm --filter @zooloo/db-schema why testcontainers`.)

- [ ] **Step 2: Testes do limitador em memória**

`apps/api/src/providers/rate-limit/rate-limiter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MemoryRateLimiter } from './memory-rate-limiter.js';

const rule = { limit: 2, windowSeconds: 60 };

describe('MemoryRateLimiter', () => {
  it('permite até o limite e bloqueia com Retry-After até o fim da janela', async () => {
    let now = 1_000_000;
    const limiter = new MemoryRateLimiter(() => now);
    expect(await limiter.hit('k', rule)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await limiter.hit('k', rule)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    now += 15_000;
    expect(await limiter.hit('k', rule)).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it('janela nova zera a contagem', async () => {
    let now = 0;
    const limiter = new MemoryRateLimiter(() => now);
    await limiter.hit('k', rule);
    await limiter.hit('k', rule);
    now += 60_000;
    expect((await limiter.hit('k', rule)).allowed).toBe(true);
  });

  it('chaves independentes', async () => {
    const limiter = new MemoryRateLimiter(() => 0);
    await limiter.hit('a', rule);
    await limiter.hit('a', rule);
    expect((await limiter.hit('b', rule)).allowed).toBe(true);
  });
});
```

`apps/api/src/providers/rate-limit/redis-rate-limiter.test.ts`:

```ts
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createClient } from 'redis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RedisRateLimiter } from './redis-rate-limiter.js';

let container: StartedTestContainer;
let client: ReturnType<typeof createClient>;

beforeAll(async () => {
  container = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
  client = createClient({ url: `redis://${container.getHost()}:${container.getMappedPort(6379)}` });
  await client.connect();
}, 180_000);

afterAll(async () => {
  await client?.quit();
  await container?.stop();
});

describe('RedisRateLimiter', () => {
  it('conta por chave, bloqueia acima do limite e informa o TTL', async () => {
    const limiter = new RedisRateLimiter(client);
    const rule = { limit: 2, windowSeconds: 60 };
    expect((await limiter.hit('t:1', rule)).allowed).toBe(true);
    expect((await limiter.hit('t:1', rule)).allowed).toBe(true);
    const blocked = await limiter.hit('t:1', rule);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('a chave sempre expira (nunca bloqueia para sempre)', async () => {
    const limiter = new RedisRateLimiter(client);
    await limiter.hit('t:2', { limit: 5, windowSeconds: 30 });
    expect(await client.ttl('zl:rl:t:2')).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @zooloo/api exec vitest run src/providers/rate-limit`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 4: Implementar**

`apps/api/src/providers/rate-limit/rate-limiter.ts`:

```ts
/** Regra de janela fixa: no máximo `limit` acertos a cada `windowSeconds` (SEC-AP-04). */
export interface RateRule {
  readonly limit: number;
  readonly windowSeconds: number;
}

export interface RateDecision {
  readonly allowed: boolean;
  /** Segundos até a janela reabrir; 0 quando permitido. */
  readonly retryAfterSeconds: number;
}

/** Porta do rate limit. Redis em dev e produção; memória quando não há `REDIS_URL` (testes). */
export interface RateLimiter {
  hit(key: string, rule: RateRule): Promise<RateDecision>;
}
```

`apps/api/src/providers/rate-limit/memory-rate-limiter.ts`:

```ts
import { currentWallMs } from '../clock.js';
import type { RateDecision, RateLimiter, RateRule } from './rate-limiter.js';

/** Limitador de um processo só: testes e desenvolvimento sem Redis. Nunca em produção (env). */
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly now: () => number = currentWallMs) {}

  hit(key: string, rule: RateRule): Promise<RateDecision> {
    const now = this.now();
    const current = this.windows.get(key);
    const window =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + rule.windowSeconds * 1_000 };
    window.count += 1;
    this.windows.set(key, window);
    return Promise.resolve(
      window.count <= rule.limit
        ? { allowed: true, retryAfterSeconds: 0 }
        : { allowed: false, retryAfterSeconds: Math.ceil((window.resetAt - now) / 1_000) },
    );
  }
}
```

`apps/api/src/providers/rate-limit/redis-rate-limiter.ts`:

```ts
import type { createClient } from 'redis';
import type { RateDecision, RateLimiter, RateRule } from './rate-limiter.js';

export type RedisCounter = Pick<ReturnType<typeof createClient>, 'multi' | 'ttl'>;

const PREFIX = 'zl:rl:';

/**
 * Janela fixa no Redis: `INCR` e `EXPIRE … NX` na mesma transação, então a chave sempre expira,
 * mesmo se o processo cair entre os comandos.
 */
export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly client: RedisCounter) {}

  async hit(key: string, rule: RateRule): Promise<RateDecision> {
    const redisKey = `${PREFIX}${key}`;
    const [count] = await this.client
      .multi()
      .incr(redisKey)
      .expire(redisKey, rule.windowSeconds, 'NX')
      .exec();
    if (Number(count) <= rule.limit) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const ttl = await this.client.ttl(redisKey);
    return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : rule.windowSeconds };
  }
}
```

`apps/api/src/config/tokens.ts`: adicionar `export const RATE_LIMITER = Symbol('RATE_LIMITER');`.

`apps/api/src/providers/rate-limit/rate-limit.module.ts`:

```ts
import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import type { Logger } from '@zooloo/security';
import { createClient } from 'redis';
import type { Env } from '../../config/env.js';
import { ENV, LOGGER, RATE_LIMITER } from '../../config/tokens.js';
import { MemoryRateLimiter } from './memory-rate-limiter.js';
import { RedisRateLimiter } from './redis-rate-limiter.js';

const REDIS_CLIENT = Symbol('REDIS_CLIENT');
type RedisClient = ReturnType<typeof createClient>;

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ENV, LOGGER],
      useFactory: async (env: Env, logger: Logger): Promise<RedisClient | null> => {
        if (env.REDIS_URL === undefined) {
          return null;
        }
        const client = createClient({ url: env.REDIS_URL });
        client.on('error', (err: unknown) => logger.error('redis indisponível', { err }));
        await client.connect();
        return client;
      },
    },
    {
      provide: RATE_LIMITER,
      inject: [REDIS_CLIENT],
      useFactory: (client: RedisClient | null) =>
        client ? new RedisRateLimiter(client) : new MemoryRateLimiter(),
    },
  ],
  exports: [RATE_LIMITER],
})
export class RateLimitModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: RedisClient | null) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client?.quit();
  }
}
```

`apps/api/src/config/env.ts`: dentro do `z.object`, depois de `DEV_AUTH`:

```ts
    /** Redis do rate limit (SEC-AP-04). Obrigatório em produção; sem ele, limite em memória. */
    REDIS_URL: z
      .url({ protocol: /^rediss?$/, error: 'REDIS_URL precisa ser redis:// ou rediss://' })
      .optional(),
    /** Chave do site público para `POST /waitlist` (ADR-0009). Sem ela, o endpoint responde 401. */
    SITE_API_KEY: z.string().min(32, 'SITE_API_KEY precisa ter ao menos 32 caracteres.').optional(),
```

e encadear, depois do `.refine` existente:

```ts
  .refine((env) => env.NODE_ENV !== 'production' || env.REDIS_URL !== undefined, {
    message: 'REDIS_URL é obrigatória em produção.',
    path: ['REDIS_URL'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.SITE_API_KEY !== undefined, {
    message: 'SITE_API_KEY é obrigatória em produção.',
    path: ['SITE_API_KEY'],
  });
```

`apps/api/src/config/env.test.ts`: adicionar casos — produção sem `REDIS_URL` falha citando `REDIS_URL`; produção sem `SITE_API_KEY` falha; `SITE_API_KEY` curta falha; `REDIS_URL=http://x` falha; a mensagem de erro nunca contém o valor da chave (usar `'k'.repeat(10)` e verificar `not.toContain('kkkkkkkkkk')`). Seguir o estilo dos casos existentes do arquivo.

`apps/api/src/app.module.ts`: importar `RateLimitModule` e incluir em `imports: [DatabaseModule, RateLimitModule, SyncModule, ...extraModules]`.

`apps/api/src/testing/test-app.ts`: no `env` padrão não definir `REDIS_URL` (usa memória) e adicionar `SITE_API_KEY: TEST_SITE_API_KEY`, com `export const TEST_SITE_API_KEY = 'k'.repeat(40);` no topo do arquivo.

- [ ] **Step 5: Verificar**

Run: `pnpm --filter @zooloo/api test:coverage && pnpm --filter @zooloo/api typecheck`
Expected: PASS, cobertura ≥ 90%.

- [ ] **Step 6: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): RateLimiter port with Redis and in-memory adapters"
```

---

### Task 8: Módulo `waitlist` da API

**Files:**
- Create: `apps/api/src/modules/waitlist/site-key.guard.ts`, `waitlist.controller.ts`, `waitlist.service.ts`, `waitlist.repo.ts`, `waitlist.module.ts`, `waitlist.test.ts`, `site-key.guard.test.ts`
- Modify: `apps/api/src/app.module.ts`, `apps/api/openapi.json`

**Interfaces:**
- Consumes: `WaitlistSignupSchema`, `WaitlistAcceptedSchema` (Task 3); `waitlistEntries` (Task 5); `newId`, `DatabaseService.withoutUser`, `ProblemException(problem, headers)` (Task 6); `RATE_LIMITER`, `RateLimiter` (Task 7); `TEST_SITE_API_KEY` (Task 7).
- Produces: `POST /api/v1/waitlist` — cabeçalhos `Authorization: Bearer <SITE_API_KEY>`, opcional `X-Client-Ip`; corpo `WaitlistSignup`; respostas 202/401/422/429/503. Constantes exportadas `CLIENT_IP_HEADER = 'x-client-ip'`, `WAITLIST_RULES`.

- [ ] **Step 1: Testes de integração**

`apps/api/src/modules/waitlist/waitlist.test.ts`:

```ts
import { ProblemSchema, WaitlistAcceptedSchema } from '@zooloo/validation';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApi, TEST_SITE_API_KEY, type TestApi } from '../../testing/test-app.js';

let api: TestApi;
let ipSeq = 1;
/** IP de documentação novo por teste, para cada um ter o próprio balde do limite. */
const nextIp = (): string => `198.51.100.${ipSeq++}`;

const body = (email: string, extra: Record<string, unknown> = {}) => ({
  email,
  privacyAccepted: true,
  marketingOptIn: false,
  privacyVersion: '2026-11-23',
  ...extra,
});

function signup(payload: unknown, headers: Record<string, string> = {}) {
  return api.app.inject({
    method: 'POST',
    url: '/api/v1/waitlist',
    headers: { authorization: `Bearer ${TEST_SITE_API_KEY}`, ...headers },
    payload: payload as Record<string, unknown>,
  });
}

const count = async (email: string): Promise<number> => {
  const { rows } = await api.db.owner.query<{ n: number }>(
    'select count(*)::int as n from waitlist_entries where lower(email) = $1',
    [email],
  );
  return rows[0]?.n ?? 0;
};

beforeAll(async () => {
  api = await startTestApi();
});

afterAll(async () => {
  await api?.close();
});

describe('POST /api/v1/waitlist', () => {
  it('novo e repetido respondem 202 idêntico e gravam uma vez', async () => {
    const ip = nextIp();
    const first = await signup(body('ana@example.test'), { 'x-client-ip': ip });
    const again = await signup(body(' Ana@Example.TEST'), { 'x-client-ip': ip });
    expect(first.statusCode).toBe(202);
    expect(again.statusCode).toBe(202);
    expect(again.body).toBe(first.body);
    expect(WaitlistAcceptedSchema.parse(first.json())).toEqual({ status: 'accepted' });
    expect(await count('ana@example.test')).toBe(1);
  });

  it('envios simultâneos do mesmo e-mail não geram erro', async () => {
    const responses = await Promise.all(
      [1, 2, 3].map(() => signup(body('bia@example.test'), { 'x-client-ip': nextIp() })),
    );
    expect(responses.map((response) => response.statusCode)).toEqual([202, 202, 202]);
    expect(await count('bia@example.test')).toBe(1);
  });

  it('honeypot preenchido responde igual e não grava', async () => {
    const response = await signup(body('robo@example.test', { website: 'http://spam.test' }), {
      'x-client-ip': nextIp(),
    });
    expect(response.statusCode).toBe(202);
    expect(await count('robo@example.test')).toBe(0);
  });

  it('grava o opt-in de marketing e a versão da política', async () => {
    await signup(body('caio@example.test', { marketingOptIn: true }), { 'x-client-ip': nextIp() });
    const { rows } = await api.db.owner.query(
      'select marketing_opt_in, privacy_version from waitlist_entries where email = $1',
      ['caio@example.test'],
    );
    expect(rows[0]).toEqual({ marketing_opt_in: true, privacy_version: '2026-11-23' });
  });

  it('sem chave ou com chave errada: 401 problem+json', async () => {
    for (const authorization of [undefined, 'Bearer errada', `Basic ${TEST_SITE_API_KEY}`]) {
      const response = await api.app.inject({
        method: 'POST',
        url: '/api/v1/waitlist',
        headers: authorization ? { authorization } : {},
        payload: body('dani@example.test'),
      });
      expect(response.statusCode, authorization).toBe(401);
      expect(response.headers['content-type']).toContain('application/problem+json');
    }
    expect(await count('dani@example.test')).toBe(0);
  });

  it('corpo inválido: 422 com o campo', async () => {
    const response = await signup(body('não-é-email'), { 'x-client-ip': nextIp() });
    expect(response.statusCode).toBe(422);
    const problem = ProblemSchema.parse(response.json());
    expect(problem.errors?.map((error) => error.path)).toContain('email');
  });

  it('sexta tentativa do mesmo IP na hora: 429 com Retry-After', async () => {
    const ip = nextIp();
    for (let index = 0; index < 5; index += 1) {
      const ok = await signup(body(`lote${index}@example.test`), { 'x-client-ip': ip });
      expect(ok.statusCode).toBe(202);
    }
    const blocked = await signup(body('lote5@example.test'), { 'x-client-ip': ip });
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(await count('lote5@example.test')).toBe(0);
  });

  it('X-Client-Ip inválido cai no IP da conexão', async () => {
    const response = await signup(body('eva@example.test'), { 'x-client-ip': 'não-é-ip' });
    expect(response.statusCode).toBe(202);
  });

  it('nenhum e-mail aparece nos logs, nem mascarado', () => {
    const text = JSON.stringify(api.logs);
    expect(text).not.toContain('example.test');
  });
});
```

Teste da regra "`X-Client-Ip` sem chave é ignorado" fica no teste unitário do guard, porque sem chave a requisição para no 401.

`apps/api/src/modules/waitlist/site-key.guard.test.ts`:

```ts
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Env } from '../../config/env.js';
import { ProblemException } from '../../runtime/http/problem.js';
import { type RequestWithClientIp, SiteKeyGuard } from './site-key.guard.js';

const KEY = 'k'.repeat(40);

function contextFor(headers: Record<string, string>, ip = '10.0.0.1') {
  const request = { headers, ip } as unknown as RequestWithClientIp;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, context };
}

const guard = (key: string | undefined) => new SiteKeyGuard({ SITE_API_KEY: key } as Env);

describe('SiteKeyGuard', () => {
  it('chave certa: usa X-Client-Ip válido', () => {
    const { request, context } = contextFor({
      authorization: `Bearer ${KEY}`,
      'x-client-ip': '203.0.113.7',
    });
    expect(guard(KEY).canActivate(context)).toBe(true);
    expect(request.clientIp).toBe('203.0.113.7');
  });

  it('chave certa sem X-Client-Ip: IP da conexão', () => {
    const { request, context } = contextFor({ authorization: `Bearer ${KEY}` });
    guard(KEY).canActivate(context);
    expect(request.clientIp).toBe('10.0.0.1');
  });

  it('aceita IPv6', () => {
    const { request, context } = contextFor({
      authorization: `Bearer ${KEY}`,
      'x-client-ip': '2001:db8::1',
    });
    guard(KEY).canActivate(context);
    expect(request.clientIp).toBe('2001:db8::1');
  });

  it('chave errada, de outro tamanho ou ausente: 401 sem ler X-Client-Ip', () => {
    for (const authorization of [`Bearer ${'x'.repeat(40)}`, 'Bearer curta', '']) {
      const { request, context } = contextFor({ authorization, 'x-client-ip': '203.0.113.9' });
      expect(() => guard(KEY).canActivate(context)).toThrow(ProblemException);
      expect(request.clientIp).toBeUndefined();
    }
  });

  it('API sem SITE_API_KEY configurada: sempre 401', () => {
    const { context } = contextFor({ authorization: `Bearer ${KEY}` });
    expect(() => guard(undefined).canActivate(context)).toThrow(ProblemException);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @zooloo/api exec vitest run src/modules/waitlist`
Expected: FAIL — módulos inexistentes / 404.

- [ ] **Step 3: Guard**

`apps/api/src/modules/waitlist/site-key.guard.ts`:

```ts
import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import * as z from 'zod';
import type { Env } from '../../config/env.js';
import { ENV } from '../../config/tokens.js';
import { ProblemException, problemForStatus } from '../../runtime/http/problem.js';

/** IP do visitante repassado pelo servidor do site (ADR-0009). */
export const CLIENT_IP_HEADER = 'x-client-ip';

export type RequestWithClientIp = FastifyRequest & { clientIp?: string };

const IpSchema = z.union([z.ipv4(), z.ipv6()]);
const BEARER = /^Bearer (.+)$/;

const unauthorized = (): ProblemException =>
  new ProblemException({ ...problemForStatus(401), detail: 'Chave do site ausente ou inválida.' });

function sameKey(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Só o servidor do site chama a lista de espera. Com a chave válida, o IP do visitante vem de
 * `X-Client-Ip`; sem ela, nada do cabeçalho é lido.
 */
@Injectable()
export class SiteKeyGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithClientIp>();
    const expected = this.env.SITE_API_KEY;
    const given = BEARER.exec(String(request.headers.authorization ?? ''))?.[1];
    if (expected === undefined || given === undefined || !sameKey(given, expected)) {
      throw unauthorized();
    }
    const forwarded = IpSchema.safeParse(request.headers[CLIENT_IP_HEADER]);
    request.clientIp = forwarded.success ? forwarded.data : request.ip;
    return true;
  }
}
```

- [ ] **Step 4: Repo, service, controller, module**

`apps/api/src/modules/waitlist/waitlist.repo.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { waitlistEntries } from '@zooloo/db-schema';
import { DatabaseService } from '../../providers/database/database.service.js';

export interface NewWaitlistEntry {
  readonly id: string;
  readonly email: string;
  readonly marketingOptIn: boolean;
  readonly privacyVersion: string;
}

@Injectable()
export class WaitlistRepo {
  constructor(private readonly database: DatabaseService) {}

  /** Grava ou ignora se o e-mail já existe; nunca lê a tabela (o papel só tem INSERT). */
  async insertIgnoringDuplicate(entry: NewWaitlistEntry): Promise<void> {
    await this.database.withoutUser((tx) =>
      tx.insert(waitlistEntries).values(entry).onConflictDoNothing(),
    );
  }
}
```

`apps/api/src/modules/waitlist/waitlist.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import type { Logger } from '@zooloo/security';
import type { WaitlistSignup } from '@zooloo/validation';
import { LOGGER, RATE_LIMITER } from '../../config/tokens.js';
import { newId } from '../../providers/ids.js';
import type { RateLimiter } from '../../providers/rate-limit/rate-limiter.js';
import { ProblemException, problemForStatus } from '../../runtime/http/problem.js';
import { WaitlistRepo } from './waitlist.repo.js';

/** Limites da lista de espera (SEC-AP-04, ADR-0009). */
export const WAITLIST_RULES = {
  perIp: { limit: 5, windowSeconds: 3_600 },
  site: { limit: 120, windowSeconds: 60 },
} as const;

@Injectable()
export class WaitlistService {
  constructor(
    private readonly repo: WaitlistRepo,
    @Inject(RATE_LIMITER) private readonly limiter: RateLimiter,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async signup(input: WaitlistSignup, clientIp: string): Promise<void> {
    await this.enforceLimits(clientIp);
    if (input.website !== undefined && input.website !== '') {
      this.logger.info('lista de espera: honeypot preenchido');
      return;
    }
    await this.repo.insertIgnoringDuplicate({
      id: newId(),
      email: input.email,
      marketingOptIn: input.marketingOptIn,
      privacyVersion: input.privacyVersion,
    });
    this.logger.info('lista de espera: inscrição aceita', { marketingOptIn: input.marketingOptIn });
  }

  private async enforceLimits(clientIp: string): Promise<void> {
    let decisions;
    try {
      decisions = await Promise.all([
        this.limiter.hit('waitlist:site', WAITLIST_RULES.site),
        this.limiter.hit(`waitlist:ip:${clientIp}`, WAITLIST_RULES.perIp),
      ]);
    } catch (err) {
      // Falha fechada: sem contador, nenhum cadastro passa (SEC-AP-04).
      this.logger.error('rate limit indisponível', { err });
      throw new ProblemException({ ...problemForStatus(503), detail: 'Tente de novo mais tarde.' });
    }
    const blocked = decisions.find((decision) => !decision.allowed);
    if (blocked) {
      throw new ProblemException(
        { ...problemForStatus(429), detail: 'Muitas tentativas. Tente de novo mais tarde.' },
        { 'retry-after': String(blocked.retryAfterSeconds) },
      );
    }
  }
}
```

`apps/api/src/modules/waitlist/waitlist.controller.ts`:

```ts
import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  type WaitlistAccepted,
  WaitlistAcceptedSchema,
  type WaitlistSignup,
  WaitlistSignupSchema,
} from '@zooloo/validation';
import { CLIENT_IP_HEADER, type RequestWithClientIp, SiteKeyGuard } from './site-key.guard.js';
import { WaitlistService } from './waitlist.service.js';

const ACCEPTED: WaitlistAccepted = { status: 'accepted' };

/** Lista de espera do beta, chamada só pelo servidor do site (doc 11 §4.3, ADR-0009). */
@ApiTags('waitlist')
@ApiBearerAuth()
@ApiHeader({ name: CLIENT_IP_HEADER, required: false, description: 'IP do visitante' })
@UseGuards(SiteKeyGuard)
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  /**
   * Sem `Idempotency-Key` (exceção ao SEC-AP-05, ADR-0009): o e-mail é a chave natural e o reenvio
   * não duplica. Resposta sempre igual, exista o e-mail ou não.
   */
  @Post()
  @HttpCode(202)
  @ApiAcceptedResponse({ description: 'Recebido', standardSchema: WaitlistAcceptedSchema })
  @ApiUnauthorizedResponse({ description: 'Chave do site ausente ou inválida' })
  @ApiUnprocessableEntityResponse({ description: 'Dados inválidos' })
  @ApiTooManyRequestsResponse({ description: 'Limite de tentativas' })
  @ApiServiceUnavailableResponse({ description: 'Rate limit indisponível' })
  async signup(
    @Req() request: RequestWithClientIp,
    @Body({ schema: WaitlistSignupSchema }) body: WaitlistSignup,
  ): Promise<WaitlistAccepted> {
    await this.waitlist.signup(body, request.clientIp ?? request.ip);
    return ACCEPTED;
  }
}
```

`apps/api/src/modules/waitlist/waitlist.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SiteKeyGuard } from './site-key.guard.js';
import { WaitlistController } from './waitlist.controller.js';
import { WaitlistRepo } from './waitlist.repo.js';
import { WaitlistService } from './waitlist.service.js';

@Module({
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitlistRepo, SiteKeyGuard],
})
export class WaitlistModule {}
```

`apps/api/src/app.module.ts`: `imports: [DatabaseModule, RateLimitModule, SyncModule, WaitlistModule, ...extraModules]`.

- [ ] **Step 5: Teste do 503 (unitário)**

Adicionar em `waitlist.test.ts` (fora do `describe` de integração, sem banco):

```ts
import { createLogger } from '@zooloo/security';
import { ProblemException } from '../../runtime/http/problem.js';
import type { WaitlistRepo } from './waitlist.repo.js';
import { WaitlistService } from './waitlist.service.js';

describe('WaitlistService sem rate limit', () => {
  it('Redis fora: 503 e nada é gravado', async () => {
    const inserted: unknown[] = [];
    const repo = { insertIgnoringDuplicate: (e: unknown) => inserted.push(e) } as unknown as WaitlistRepo;
    const limiter = { hit: () => Promise.reject(new Error('ECONNREFUSED 10.0.0.9:6379')) };
    const service = new WaitlistService(repo, limiter, createLogger({ sink: () => {}, level: 'error' }));
    const error: unknown = await service
      .signup(
        { email: 'f@example.test', privacyAccepted: true, marketingOptIn: false, privacyVersion: '2026-11-23' },
        '192.0.2.1',
      )
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemException);
    expect((error as ProblemException).problem.status).toBe(503);
    expect(JSON.stringify((error as ProblemException).problem)).not.toContain('10.0.0.9');
    expect(inserted).toEqual([]);
  });
});
```

(Juntar os imports no topo do arquivo.)

- [ ] **Step 6: Verificar e regenerar OpenAPI**

Run: `pnpm --filter @zooloo/api test:coverage && pnpm build && pnpm --filter @zooloo/api openapi`
Expected: PASS; `apps/api/openapi.json` ganha `/api/v1/waitlist`. `git diff apps/api/openapi.json` só com a rota nova.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): POST /waitlist with site key, neutral 202 and rate limit"
```

---

### Task 9: Esqueleto do `apps/site` (Next.js, CSP, layout)

**Files:**
- Create: `apps/site/package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `scripts/generate-tokens-css.ts`, `scripts/prepare-standalone.ts`, `src/proxy.ts`, `src/server/csp.ts`, `src/server/csp.test.ts`, `src/app/layout.tsx`, `src/app/fonts.ts`, `src/app/globals.css`, `src/app/tokens.generated.css`, `src/app/tokens.test.ts`, `src/app/page.tsx` (provisória), `src/ui/site-chrome.module.css`, `src/ui/SiteHeader.tsx`, `src/ui/SiteFooter.tsx`, `src/ui/site-chrome.test.tsx`, `src/testing/setup.ts`, `src/testing/axe.ts`
- Modify: `eslint.config.mjs`, `.prettierignore`, `.gitignore`, `turbo.json`

**Interfaces:**
- Consumes: `tokensCss` (Task 1), `ZoolooLogo` (Task 2), `t('site.*')` (Task 4).
- Produces: `buildCsp(nonce: string, isDev: boolean): string`; `SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }>`; `<SiteHeader />`, `<SiteFooter />`; `axeViolations(container: Element): Promise<string[]>`.

- [ ] **Step 1: Pacote e configuração**

`apps/site/package.json`:

```json
{
  "name": "@zooloo/site",
  "version": "0.0.0",
  "private": true,
  "description": "Site público (Next.js, doc 09 §2.2): landing, lista de espera do beta, termos e privacidade.",
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build && node scripts/prepare-standalone.ts",
    "start": "node .next/standalone/apps/site/server.js",
    "typecheck": "next typegen && tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "tokens": "node scripts/generate-tokens-css.ts"
  },
  "dependencies": {
    "@fontsource-variable/inter": "5.3.0",
    "@fontsource-variable/plus-jakarta-sans": "5.3.0",
    "@zooloo/i18n": "workspace:*",
    "@zooloo/security": "workspace:*",
    "@zooloo/ui-tokens": "workspace:*",
    "@zooloo/ui-web": "workspace:*",
    "@zooloo/validation": "workspace:*",
    "next": "16.4.6",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "zod": "4.6.7"
  },
  "devDependencies": {
    "@playwright/test": "1.65.1",
    "@testing-library/react": "16.3.3",
    "@testing-library/user-event": "14.6.12",
    "@types/node": "26.6.6",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.3.0",
    "@vitest/coverage-v8": "5.1.0",
    "@zooloo/vitest-config": "workspace:*",
    "axe-core": "4.14.1",
    "jsdom": "31.0.1",
    "typescript": "6.0.3",
    "vitest": "5.1.0"
  }
}
```

Rodar `pnpm install`. Se o pnpm pedir para liberar scripts de instalação de alguma dependência nova (ex.: `sharp`, `@next/swc-*`), **não liberar**: registrar `false` em `allowBuilds` de `pnpm-workspace.yaml` com comentário e seguir; se o build quebrar por isso, parar e escalar (SEC-DEV-03).

`apps/site/next.config.ts`:

```ts
import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { SECURITY_HEADERS } from './src/server/csp.ts';

const config: NextConfig = {
  output: 'standalone',
  // Monorepo: o rastreio do standalone inclui os pacotes de `packages/`.
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  transpilePackages: ['@zooloo/ui-web'],
  poweredByHeader: false,
  reactStrictMode: true,
  // CSP com nonce sai do proxy (src/proxy.ts); aqui os cabeçalhos fixos, inclusive dos estáticos.
  headers: () => Promise.resolve([{ source: '/:path*', headers: [...SECURITY_HEADERS] }]),
};

export default config;
```

`apps/site/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "declaration": false,
    "incremental": true,
    "types": ["node"],
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "src", "scripts", "next.config.ts", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules", ".next/standalone"]
}
```

Se `next build` reescrever o `tsconfig.json`, aceitar só os campos que ele exigir e versionar.

`apps/site/vitest.config.ts`:

```ts
import { packageTestConfig, UI_THRESHOLDS } from '@zooloo/vitest-config';
import react from '@vitejs/plugin-react';
import { mergeConfig } from 'vitest/config';

// Site público: RNF-QA-05 (≥ 70%, axe). Layout, proxy e Server Action rodam no Next: E2E (e2e/).
export default mergeConfig(packageTestConfig(UI_THRESHOLDS), {
  plugins: [react()],
  resolve: { conditions: ['@zooloo/source', 'module', 'browser', 'development|production'] },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['./src/testing/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/testing/**',
        'src/app/layout.tsx',
        'src/app/fonts.ts',
        'src/proxy.ts',
        'src/app/beta/actions.ts',
      ],
    },
  },
});
```

`apps/site/src/testing/setup.ts`: igual ao de `packages/ui-web` (Task 2).

`apps/site/src/testing/axe.ts`:

```ts
import axe from 'axe-core';

/** Violações WCAG 2.1 AA (RNF-QA-05). Contraste é garantido pelos tokens, não medido no jsdom. */
export async function axeViolations(container: Element): Promise<string[]> {
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return result.violations.map((violation) => `${violation.id}: ${violation.help}`);
}
```

Ferramentas da raiz:
- `.gitignore`: adicionar `.next/` e `next-env.d.ts`.
- `.prettierignore`: adicionar `.next/`, `next-env.d.ts` e `apps/site/src/app/tokens.generated.css`.
- `eslint.config.mjs`: em `ignores`, adicionar `'**/.next/**'` e `'**/next-env.d.ts'`; nos blocos de react-hooks, jsx-a11y e globais de navegador, incluir `'apps/site/src/**/*.tsx'`; no bloco de scripts de geração, incluir `'apps/site/scripts/**/*.ts'`.
- `turbo.json`: `build.outputs` vira `["dist/**", ".next/**", "!.next/cache/**"]`.

- [ ] **Step 2: Testes de CSP e cabeçalhos**

`apps/site/src/server/csp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCsp, newNonce, SECURITY_HEADERS } from './csp.ts';

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split(';').map((part) => {
      const [name = '', ...values] = part.trim().split(/\s+/);
      return [name, values];
    }),
  );

describe('buildCsp', () => {
  it('produção: scripts e estilos só com nonce, nada inline nem eval', () => {
    const csp = directives(buildCsp('abc123', false));
    expect(csp['script-src']).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
    expect(csp['style-src']).toEqual(["'self'", "'nonce-abc123'"]);
    expect(buildCsp('abc123', false)).not.toContain('unsafe');
  });

  it('fecha o resto: frames, base, objetos, formulários só para a própria origem', () => {
    const csp = directives(buildCsp('n', false));
    expect(csp['default-src']).toEqual(["'self'"]);
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'none'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['form-action']).toEqual(["'self'"]);
    expect(csp['connect-src']).toEqual(["'self'"]);
  });

  it('desenvolvimento: eval para o React e estilo inline do HMR', () => {
    const csp = directives(buildCsp('n', true));
    expect(csp['script-src']).toContain("'unsafe-eval'");
    expect(csp['style-src']).toEqual(["'self'", "'unsafe-inline'"]);
  });
});

describe('newNonce', () => {
  it('base64 de 128 bits, diferente a cada chamada', () => {
    const a = newNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(newNonce()).not.toBe(a);
  });
});

describe('SECURITY_HEADERS', () => {
  it('HSTS, nosniff, referrer e permissões fechadas', () => {
    const map = Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key, value]));
    expect(map['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains; preload');
    expect(map['X-Content-Type-Options']).toBe('nosniff');
    expect(map['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(map['Permissions-Policy']).toContain('camera=()');
    expect(map['Cross-Origin-Opener-Policy']).toBe('same-origin');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @zooloo/site test`
Expected: FAIL — `./csp.ts` inexistente.

- [ ] **Step 4: Implementar CSP e proxy**

`apps/site/src/server/csp.ts`:

```ts
/** Nonce de 128 bits por requisição (Web Crypto: roda no proxy do Next). */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * CSP do site (SEC-AP-08). Scripts e estilos só com nonce; `strict-dynamic` deixa os chunks do
 * Next carregados pelo script com nonce. Em dev, o React precisa de eval e o HMR injeta estilo.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const script = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])];
  const style = isDev ? ["'self'", "'unsafe-inline'"] : ["'self'", `'nonce-${nonce}'`];
  return [
    "default-src 'self'",
    `script-src ${script.join(' ')}`,
    `style-src ${style.join(' ')}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

/** Cabeçalhos fixos de toda resposta, inclusive estáticos (next.config.ts). */
export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];
```

`apps/site/src/proxy.ts`:

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { buildCsp, newNonce } from './server/csp.ts';

/** CSP com nonce novo por requisição; o Next aplica o nonce aos próprios scripts (ADR-0009). */
export function proxy(request: NextRequest): NextResponse {
  const nonce = newNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|icon.svg).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
```

- [ ] **Step 5: Tokens gerados**

`apps/site/scripts/generate-tokens-css.ts`:

```ts
import { writeFileSync } from 'node:fs';
import { tokensCss } from '@zooloo/ui-tokens';

// Folha estática das variáveis `--zl-*`; o teste src/app/tokens.test.ts confere que está em dia.
const target = new URL('../src/app/tokens.generated.css', import.meta.url);
writeFileSync(target, `/* Gerado por pnpm --filter @zooloo/site tokens. Não edite. */\n${tokensCss()}\n`);
```

`apps/site/src/app/tokens.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { tokensCss } from '@zooloo/ui-tokens';
import { describe, expect, it } from 'vitest';

describe('tokens.generated.css', () => {
  it('está em dia com @zooloo/ui-tokens (rode pnpm --filter @zooloo/site tokens)', () => {
    const file = readFileSync(new URL('./tokens.generated.css', import.meta.url), 'utf8');
    expect(file).toBe(`/* Gerado por pnpm --filter @zooloo/site tokens. Não edite. */\n${tokensCss()}\n`);
  });
});
```

Run: `pnpm --filter @zooloo/ui-tokens build && pnpm --filter @zooloo/site tokens`

- [ ] **Step 6: Fontes, layout, cabeçalho e rodapé**

`apps/site/src/app/fonts.ts`:

```ts
import localFont from 'next/font/local';

// Subsets latinos servidos pelo próprio site (doc 13 §3); nada de CDN de fontes.
export const inter = localFont({
  src: [
    { path: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', weight: '100 900' },
    { path: '../../node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2', weight: '100 900' },
  ],
  variable: '--zl-face-ui',
  display: 'swap',
});

export const jakarta = localFont({
  src: [
    { path: '../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2', weight: '200 800' },
    { path: '../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-ext-wght-normal.woff2', weight: '200 800' },
  ],
  variable: '--zl-face-display',
  display: 'swap',
});
```

`apps/site/src/app/globals.css`:

```css
/* Base do site. Cores e escala vêm de tokens.generated.css (doc 13 §6). */
html:root {
  /* `html:root` vence o `:root` dos tokens: as famílias vêm do next/font. */
  --zl-font-ui: var(--zl-face-ui), system-ui, sans-serif;
  --zl-font-display: var(--zl-face-display), system-ui, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--zl-font-ui);
  font-size: var(--zl-text-md);
  line-height: 1.5;
  color: var(--zl-text);
  background: var(--zl-background);
}

h1,
h2,
h3 {
  font-family: var(--zl-font-display);
  line-height: 1.2;
}

a {
  color: var(--zl-link);
}

:focus-visible {
  outline: 3px solid var(--zl-focus);
  outline-offset: 2px;
}

.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus {
  left: 1rem;
  top: 1rem;
  padding: 0.5rem 1rem;
  background: var(--zl-surface);
  z-index: 10;
}
```

Antes de usar `--zl-focus`, `--zl-surface`, `--zl-link`, `--zl-text`, `--zl-background`, conferir os nomes em `packages/ui-tokens/src/themes.ts` (`themeToCssVariables`) e trocar pelos existentes se diferirem.

`apps/site/src/ui/SiteHeader.tsx`:

```tsx
import { t } from '@zooloo/i18n';
import { ZoolooLogo } from '@zooloo/ui-web';
import Link from 'next/link';
import styles from './site-chrome.module.css';

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <ZoolooLogo />
      </Link>
      <nav aria-label={t('site.nav.label')}>
        <ul className={styles.nav}>
          <li>
            <Link href="/">{t('site.nav.home')}</Link>
          </li>
          <li>
            <Link href="/beta" className={styles.cta}>
              {t('site.nav.beta')}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
```

`apps/site/src/ui/SiteFooter.tsx`:

```tsx
import { t } from '@zooloo/i18n';
import Link from 'next/link';
import styles from './site-chrome.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <nav aria-label={t('site.footer.legal')}>
        <ul className={styles.nav}>
          <li>
            <Link href="/termos">{t('site.nav.terms')}</Link>
          </li>
          <li>
            <Link href="/privacidade">{t('site.nav.privacy')}</Link>
          </li>
        </ul>
      </nav>
      <p className={styles.rights}>{t('site.footer.rights')}</p>
    </footer>
  );
}
```

`apps/site/src/ui/site-chrome.module.css`:

```css
.header,
.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 72rem;
  margin: 0 auto;
  padding: 1rem 1.5rem;
}

.footer {
  border-top: 1px solid var(--zl-border);
  margin-top: 4rem;
  font-size: var(--zl-text-sm);
}

.brand {
  text-decoration: none;
}

.nav {
  display: flex;
  gap: 1.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cta {
  font-weight: 600;
}

.rights {
  margin: 0;
  color: var(--zl-text-muted);
}
```

`apps/site/src/app/layout.tsx`:

```tsx
import { t } from '@zooloo/i18n';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { SiteFooter } from '../ui/SiteFooter.tsx';
import { SiteHeader } from '../ui/SiteHeader.tsx';
import { inter, jakarta } from './fonts.ts';
import './tokens.generated.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: t('app.name'), template: `%s · ${t('app.name')}` },
  description: t('site.hero.lead'),
};

export default async function RootLayout({ children }: { readonly children: ReactNode }) {
  // Toda página por requisição: o nonce da CSP só existe com requisição (ADR-0009).
  await connection();
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        <a className="skip-link" href="#conteudo">
          {t('site.nav.skip')}
        </a>
        <SiteHeader />
        <main id="conteudo">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
```


`apps/site/src/ui/site-chrome.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../testing/axe.ts';
import { SiteFooter } from './SiteFooter.tsx';
import { SiteHeader } from './SiteHeader.tsx';

describe('cabeçalho e rodapé', () => {
  it('links para beta, termos e privacidade', () => {
    render(
      <>
        <SiteHeader />
        <SiteFooter />
      </>,
    );
    expect(screen.getByRole('link', { name: 'Beta' }).getAttribute('href')).toBe('/beta');
    expect(screen.getByRole('link', { name: 'Termos de uso' }).getAttribute('href')).toBe('/termos');
    expect(screen.getByRole('link', { name: 'Privacidade' }).getAttribute('href')).toBe('/privacidade');
  });

  it('sem violações axe', async () => {
    const { container } = render(
      <>
        <SiteHeader />
        <main>conteúdo</main>
        <SiteFooter />
      </>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
```

Página provisória para o build (substituída na Task 10) — `apps/site/src/app/page.tsx`:

```tsx
export default function HomePage() {
  return <h1>Zooloo Finanças</h1>;
}
```

`apps/site/scripts/prepare-standalone.ts`:

```ts
import { cpSync, existsSync } from 'node:fs';

// O standalone não copia estáticos nem `public/` (doc do Next, output: standalone).
const app = new URL('../', import.meta.url);
const target = new URL('.next/standalone/apps/site/', app);
cpSync(new URL('.next/static/', app), new URL('.next/static/', target), { recursive: true });
if (existsSync(new URL('public/', app))) {
  cpSync(new URL('public/', app), new URL('public/', target), { recursive: true });
}
```

- [ ] **Step 7: Verificar**

Run: `pnpm --filter @zooloo/site test:coverage && pnpm --filter @zooloo/site typecheck && pnpm turbo run build --filter=@zooloo/site... && pnpm lint && pnpm depcruise && pnpm format:check`
Expected: tudo PASS. Subir `PORT=4179 HOSTNAME=127.0.0.1 node apps/site/.next/standalone/apps/site/server.js` e conferir `curl -sI http://127.0.0.1:4179/` com `content-security-policy` contendo `nonce-` e `strict-transport-security`. Se o standalone falhar no Windows por symlink do pnpm (`EPERM`), registrar o erro exato no relatório da tarefa e usar `next start` só para verificação local (o alvo de produção é Linux).

- [ ] **Step 8: Commit**

```bash
git add apps/site eslint.config.mjs .prettierignore .gitignore turbo.json pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "feat(site): Next.js skeleton with nonce CSP, tokens and site chrome"
```

---

### Task 10: Landing, termos, privacidade, 404 e erro

**Files:**
- Create: `apps/site/src/app/page.tsx` (substitui o provisório), `src/app/page.module.css`, `src/content/legal.ts`, `src/content/TermsOfUse.tsx`, `src/content/PrivacyPolicy.tsx`, `src/ui/LegalDocument.tsx`, `src/ui/LegalDocument.module.css`, `src/app/termos/page.tsx`, `src/app/privacidade/page.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/pages.test.tsx`

**Interfaces:**
- Produces: `PRIVACY_VERSION = '2026-11-23'`, `TERMS_VERSION = '2026-11-23'` em `src/content/legal.ts` (usados pela Task 11).

- [ ] **Step 1: Testes**

`apps/site/src/app/pages.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../testing/axe.ts';
import ErrorPage from './error.tsx';
import NotFound from './not-found.tsx';
import HomePage from './page.tsx';
import PrivacyPage from './privacidade/page.tsx';
import TermsPage from './termos/page.tsx';

describe('landing', () => {
  it('título, quatro propostas e chamada para o beta', async () => {
    const { container } = render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Suas finanças em ordem, mesmo sem internet.',
    );
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Quero participar do beta' }).getAttribute('href')).toBe('/beta');
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe.each([
  ['termos', TermsPage, 'Termos de uso'],
  ['privacidade', PrivacyPage, 'Política de privacidade'],
])('%s', (_, Page, title) => {
  it('título, versão, faixa de rascunho e sem violações axe', async () => {
    const { container } = render(<Page />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
    expect(container.textContent).toContain('Versão preliminar — revisão jurídica pendente.');
    expect(container.textContent).toContain('Versão de 23/11/2026');
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('privacidade cobre o exigido pela LGPD (doc 10 §9)', () => {
  it('dados, finalidade, base legal, operadores, região, retenção, direitos e saída da lista', () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent ?? '';
    for (const heading of [
      'Quais dados coletamos',
      'Para que usamos',
      'Base legal',
      'Com quem compartilhamos',
      'Onde ficam os dados',
      'Por quanto tempo guardamos',
      'Seus direitos',
      'Como sair da lista',
      'Encarregado (DPO)',
    ]) {
      expect(text, heading).toContain(heading);
    }
    expect(text).toContain('[A DEFINIR]');
  });
});

describe('404 e erro', () => {
  it('404 com link para o início', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: 'Voltar ao início' }).getAttribute('href')).toBe('/');
  });

  it('erro chama reset ao tentar de novo', async () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('x')} reset={reset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @zooloo/site test`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Conteúdo legal**

`apps/site/src/content/legal.ts`:

```ts
/** Versões em vigor (YYYY-MM-DD). A da política vai junto com cada inscrição na lista. */
export const PRIVACY_VERSION = '2026-11-23';
export const TERMS_VERSION = '2026-11-23';
```

`apps/site/src/ui/LegalDocument.tsx`:

```tsx
import { formatLocalDate, t } from '@zooloo/i18n';
import { parseLocalDate } from '@zooloo/domain';
import type { ReactNode } from 'react';
import styles from './LegalDocument.module.css';

export interface LegalDocumentProps {
  readonly title: string;
  readonly version: string;
  readonly children: ReactNode;
}

/** Moldura dos documentos legais: título, versão e aviso de rascunho (TD do passo 15). */
export function LegalDocument({ title, version, children }: LegalDocumentProps) {
  return (
    <article className={styles.document}>
      <p className={styles.banner} role="note">
        {t('site.legal.draftBanner')}
      </p>
      <h1>{title}</h1>
      <p className={styles.version}>
        {t('site.legal.version', { date: formatLocalDate(parseLocalDate(version)) })}
      </p>
      {children}
    </article>
  );
}
```

Conferir a assinatura de `formatLocalDate` em `packages/i18n/src/date-format.ts`; o resultado esperado é `23/11/2026`. Adicionar `"@zooloo/domain": "workspace:*"` às dependências do site.

`apps/site/src/ui/LegalDocument.module.css`:

```css
.document {
  max-width: 46rem;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.banner {
  padding: 0.75rem 1rem;
  border-radius: var(--zl-radius-md);
  background: var(--zl-warning-surface);
  color: var(--zl-warning-text);
  font-weight: 600;
}

.version {
  color: var(--zl-text-muted);
  font-size: var(--zl-text-sm);
}
```

(Conferir nomes das variáveis de aviso em `themes.ts`; usar as existentes.)

`apps/site/src/content/PrivacyPolicy.tsx` — rascunho a partir dos docs 04 §2 e 10 §9. Texto completo:

```tsx
/** Rascunho da política de privacidade da lista de espera (docs 04 §2, 10 §9). Revisão jurídica pendente. */
export function PrivacyPolicy() {
  return (
    <>
      <p>
        Esta política explica como o Zooloo Finanças trata os dados de quem entra na lista de espera
        do beta. O aplicativo terá política própria, publicada antes do cadastro de contas.
      </p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li>Seu e-mail.</li>
        <li>Se você aceitou receber novidades por e-mail (opcional).</li>
        <li>A versão desta política que você aceitou e a data da inscrição.</li>
      </ul>
      <p>
        Não guardamos seu IP, navegador ou localização junto da inscrição. O IP é usado só por
        alguns minutos para limitar tentativas abusivas e não fica associado ao seu e-mail.
      </p>

      <h2>Para que usamos</h2>
      <p>
        Para avisar quando sua vaga no beta abrir. Se você marcou a opção de novidades, também para
        enviar notícias do Zooloo; você pode desistir a qualquer momento.
      </p>

      <h2>Base legal</h2>
      <p>
        Consentimento (LGPD, art. 7º, I), dado ao marcar a caixa de aceite. O consentimento para
        novidades é separado e opcional (RNF-LGPD-05).
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>
        Não vendemos nem compartilhamos seus dados. Eles ficam com operadores que nos prestam
        serviço, sob contrato:
      </p>
      <ul>
        <li>Provedor de nuvem que hospeda o banco de dados: [A DEFINIR].</li>
        <li>Provedor de envio de e-mails: [A DEFINIR], quando os convites começarem.</li>
      </ul>
      <p>Não usamos ferramentas de análise, anúncios ou rastreadores de terceiros neste site.</p>

      <h2>Onde ficam os dados</h2>
      <p>Em servidores no Brasil.</p>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Até o fim do beta ou até você pedir para sair da lista, o que vier primeiro. Depois disso o
        registro é apagado.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode confirmar se temos seus dados, pedir acesso, correção, exclusão, portabilidade e
        revogar o consentimento (LGPD, art. 18), sem custo.
      </p>

      <h2>Como sair da lista</h2>
      <p>Escreva para [A DEFINIR] a partir do e-mail inscrito; apagamos o registro em até 15 dias.</p>

      <h2>Encarregado (DPO)</h2>
      <p>Nome e contato do encarregado: [A DEFINIR].</p>

      <h2>Mudanças nesta política</h2>
      <p>
        Mudanças relevantes serão avisadas por e-mail a quem estiver na lista, com a nova versão e a
        data no topo desta página.
      </p>
    </>
  );
}
```

`apps/site/src/content/TermsOfUse.tsx`:

```tsx
/** Rascunho dos termos de uso do site e da lista de espera. Revisão jurídica pendente. */
export function TermsOfUse() {
  return (
    <>
      <p>
        Estes termos valem para o site público do Zooloo Finanças e para a lista de espera do beta.
        O uso do aplicativo terá termos próprios, aceitos no cadastro da conta.
      </p>

      <h2>O que é a lista de espera</h2>
      <p>
        Um cadastro para receber convite do beta. Entrar na lista não garante vaga nem data; as
        vagas abrem aos poucos.
      </p>

      <h2>Seu compromisso</h2>
      <ul>
        <li>Informar um e-mail seu.</li>
        <li>Não usar meios automáticos para inscrever pessoas ou sobrecarregar o site.</li>
      </ul>

      <h2>O beta</h2>
      <p>
        O beta é uma versão em teste e pode ter falhas, mudar ou ser interrompido. As condições do
        beta serão apresentadas no convite.
      </p>

      <h2>Propriedade intelectual</h2>
      <p>Marca, textos e código do Zooloo pertencem aos seus titulares.</p>

      <h2>Privacidade</h2>
      <p>
        O tratamento dos seus dados segue a <a href="/privacidade">política de privacidade</a>.
      </p>

      <h2>Contato</h2>
      <p>[A DEFINIR].</p>

      <h2>Lei e foro</h2>
      <p>Lei brasileira. Foro: [A DEFINIR].</p>
    </>
  );
}
```

`apps/site/src/app/privacidade/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { PRIVACY_VERSION } from '../../content/legal.ts';
import { PrivacyPolicy } from '../../content/PrivacyPolicy.tsx';
import { LegalDocument } from '../../ui/LegalDocument.tsx';

export const metadata: Metadata = { title: 'Política de privacidade' };

export default function PrivacyPage() {
  return (
    <LegalDocument title="Política de privacidade" version={PRIVACY_VERSION}>
      <PrivacyPolicy />
    </LegalDocument>
  );
}
```

`apps/site/src/app/termos/page.tsx`: igual, com `TERMS_VERSION`, `TermsOfUse` e título `'Termos de uso'`.

- [ ] **Step 4: Landing, 404 e erro**

`apps/site/src/app/page.tsx`:

```tsx
import { t } from '@zooloo/i18n';
import Link from 'next/link';
import styles from './page.module.css';

const FEATURES = ['offline', 'privacy', 'web', 'family'] as const;

export default function HomePage() {
  return (
    <>
      <section className={styles.hero}>
        <h1>{t('site.hero.title')}</h1>
        <p className={styles.lead}>{t('site.hero.lead')}</p>
        <Link href="/beta" className={styles.cta}>
          {t('site.hero.cta')}
        </Link>
      </section>
      <section className={styles.features} aria-labelledby="propostas">
        <h2 id="propostas">{t('site.features.title')}</h2>
        <ul className={styles.grid}>
          {FEATURES.map((feature) => (
            <li key={feature} className={styles.card}>
              <h3>{t(`site.features.${feature}.title`)}</h3>
              <p>{t(`site.features.${feature}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
```

`apps/site/src/app/page.module.css`:

```css
.hero {
  max-width: 72rem;
  margin: 0 auto;
  padding: 4rem 1.5rem 3rem;
}

.hero h1 {
  max-width: 18ch;
  font-size: clamp(var(--zl-text-2xl), 5vw, var(--zl-text-3xl));
}

.lead {
  max-width: 40rem;
  font-size: var(--zl-text-lg);
  color: var(--zl-text-muted);
}

.cta {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.75rem 1.25rem;
  border-radius: var(--zl-radius-md);
  background: var(--zl-primary);
  color: var(--zl-on-primary);
  font-weight: 600;
  text-decoration: none;
}

.features {
  max-width: 72rem;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  padding: 1.25rem;
  border: 1px solid var(--zl-border);
  border-radius: var(--zl-radius-lg);
  background: var(--zl-surface);
}
```

(Conferir `--zl-primary`/`--zl-on-primary` em `themes.ts` e usar os nomes do botão primário do web-app, `apps/web-app/src/ui/button/Button.module.css`.)

`apps/site/src/app/not-found.tsx`:

```tsx
import { t } from '@zooloo/i18n';
import Link from 'next/link';

export default function NotFound() {
  return (
    <section>
      <h1>{t('site.notFound.title')}</h1>
      <Link href="/">{t('site.notFound.back')}</Link>
    </section>
  );
}
```

`apps/site/src/app/error.tsx`:

```tsx
'use client';

import { t } from '@zooloo/i18n';

export default function ErrorPage({ reset }: { readonly error: Error; readonly reset: () => void }) {
  return (
    <section>
      <h1>{t('site.error.title')}</h1>
      <button type="button" onClick={reset}>
        {t('site.error.retry')}
      </button>
    </section>
  );
}
```

- [ ] **Step 5: Verificar**

Run: `pnpm --filter @zooloo/site test:coverage && pnpm --filter @zooloo/site typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/site pnpm-lock.yaml
git commit -m "feat(site): landing, draft terms and privacy, 404 and error pages"
```

---

### Task 11: Lista de espera no site (`/beta`)

**Files:**
- Create: `apps/site/src/server/env.ts`, `src/server/client-ip.ts`, `src/server/join-waitlist.ts`, `src/server/logger.ts`, `src/server/site-server.test.ts`, `src/app/beta/page.tsx`, `src/app/beta/actions.ts`, `src/app/beta/WaitlistForm.tsx`, `src/app/beta/WaitlistForm.module.css`, `src/app/beta/state.ts`, `src/app/beta/WaitlistForm.test.tsx`

**Interfaces:**
- Consumes: `WaitlistSignupSchema` (Task 3), `PRIVACY_VERSION` (Task 10), `axeViolations` (Task 9); API da Task 8.
- Produces:
  - `loadSiteEnv(source): SiteEnv` com `API_URL`, `SITE_API_KEY`, `TRUSTED_PROXY_HOPS`.
  - `clientIpFrom(forwardedFor: string | null, hops: number): string | null`.
  - `type WaitlistState = { status: 'idle' } | { status: 'accepted' } | { status: 'invalid'; errors: Partial<Record<'email' | 'privacyAccepted', string>>; email: string } | { status: 'rate-limited' } | { status: 'failed' }`.
  - `joinWaitlist(formData: FormData, deps: JoinDeps): Promise<WaitlistState>`.

- [ ] **Step 1: Testes do servidor**

`apps/site/src/server/site-server.test.ts`:

```ts
import { createLogger, type LogRecord } from '@zooloo/security';
import { describe, expect, it, vi } from 'vitest';
import { clientIpFrom } from './client-ip.ts';
import { loadSiteEnv } from './env.ts';
import { joinWaitlist } from './join-waitlist.ts';

const KEY = 'k'.repeat(40);

describe('clientIpFrom', () => {
  it('pega a entrada adicionada pelo proxy confiável, contando da direita', () => {
    expect(clientIpFrom('203.0.113.5', 1)).toBe('203.0.113.5');
    expect(clientIpFrom('1.1.1.1, 203.0.113.5', 1)).toBe('203.0.113.5');
    expect(clientIpFrom('1.1.1.1, 203.0.113.5, 10.0.0.2', 2)).toBe('203.0.113.5');
  });

  it('cliente forjando a primeira entrada não escolhe o próprio IP', () => {
    expect(clientIpFrom('198.51.100.99, 203.0.113.5', 1)).not.toBe('198.51.100.99');
  });

  it('sem cabeçalho, sem proxy confiável, poucas entradas ou valor inválido: null', () => {
    expect(clientIpFrom(null, 1)).toBeNull();
    expect(clientIpFrom('203.0.113.5', 0)).toBeNull();
    expect(clientIpFrom('203.0.113.5', 2)).toBeNull();
    expect(clientIpFrom('não-é-ip', 1)).toBeNull();
  });

  it('aceita IPv6', () => {
    expect(clientIpFrom('2001:db8::7', 1)).toBe('2001:db8::7');
  });
});

describe('loadSiteEnv', () => {
  it('valida URL e chave; hops padrão 1', () => {
    expect(loadSiteEnv({ API_URL: 'http://127.0.0.1:3000', SITE_API_KEY: KEY })).toEqual({
      API_URL: 'http://127.0.0.1:3000',
      SITE_API_KEY: KEY,
      TRUSTED_PROXY_HOPS: 1,
    });
  });

  it('erro cita só nomes, nunca o valor da chave', () => {
    expect(() => loadSiteEnv({ API_URL: 'x', SITE_API_KEY: 'segredo-curto' })).toThrow(
      /API_URL.*SITE_API_KEY|SITE_API_KEY.*API_URL/s,
    );
    expect(() => loadSiteEnv({ API_URL: 'x', SITE_API_KEY: 'segredo-curto' })).not.toThrow(
      /segredo-curto/,
    );
  });
});

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

function deps(response: Response | Error) {
  const logs: LogRecord[] = [];
  const fetchMock = vi.fn((..._: Parameters<typeof fetch>) =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  return {
    logs,
    fetchMock,
    deps: {
      env: { API_URL: 'http://api.test', SITE_API_KEY: KEY, TRUSTED_PROXY_HOPS: 1 },
      clientIp: '203.0.113.5',
      fetch: fetchMock as unknown as typeof fetch,
      logger: createLogger({ sink: (record) => logs.push(record), level: 'debug' }),
    },
  };
}

const accepted = () => new Response('{"status":"accepted"}', { status: 202 });

describe('joinWaitlist', () => {
  it('envia à API com chave, IP e corpo validado', async () => {
    const { deps: d, fetchMock } = deps(accepted());
    const state = await joinWaitlist(
      form({ email: ' Ana@Example.test ', privacyAccepted: 'on', marketingOptIn: 'on', website: '' }),
      d,
    );
    expect(state).toEqual({ status: 'accepted' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://api.test/api/v1/waitlist');
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${KEY}`);
    expect(headers.get('x-client-ip')).toBe('203.0.113.5');
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'ana@example.test',
      privacyAccepted: true,
      marketingOptIn: true,
      privacyVersion: '2026-11-23',
      website: '',
    });
  });

  it('sem marcar novidades: marketingOptIn false', async () => {
    const { deps: d, fetchMock } = deps(accepted());
    await joinWaitlist(form({ email: 'ana@example.test', privacyAccepted: 'on' }), d);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).marketingOptIn).toBe(false);
  });

  it('sem IP conhecido: não envia X-Client-Ip', async () => {
    const { deps: d, fetchMock } = deps(accepted());
    await joinWaitlist(form({ email: 'ana@example.test', privacyAccepted: 'on' }), { ...d, clientIp: null });
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).has('x-client-ip')).toBe(false);
  });

  it('inválido: erros por campo, devolve o e-mail digitado e não chama a API', async () => {
    const { deps: d, fetchMock } = deps(accepted());
    const state = await joinWaitlist(form({ email: 'ana' }), d);
    expect(state).toMatchObject({ status: 'invalid', email: 'ana' });
    expect(state.status === 'invalid' && Object.keys(state.errors).sort()).toEqual([
      'email',
      'privacyAccepted',
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('429 da API: rate-limited', async () => {
    const { deps: d } = deps(new Response('{}', { status: 429 }));
    expect(await joinWaitlist(form({ email: 'ana@example.test', privacyAccepted: 'on' }), d)).toEqual({
      status: 'rate-limited',
    });
  });

  it('outro status ou rede fora: failed, logado sem e-mail', async () => {
    for (const response of [new Response('{}', { status: 401 }), new Error('ECONNREFUSED')]) {
      const { deps: d, logs } = deps(response);
      expect(await joinWaitlist(form({ email: 'ana@example.test', privacyAccepted: 'on' }), d)).toEqual({
        status: 'failed',
      });
      expect(logs).toHaveLength(1);
      expect(JSON.stringify(logs)).not.toContain('example.test');
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @zooloo/site exec vitest run src/server`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementar o servidor**

`apps/site/src/server/env.ts`:

```ts
import * as z from 'zod';

const SiteEnvSchema = z.object({
  /** Base da API (sem `/api/v1`). */
  API_URL: z.url({ protocol: /^https?$/ }),
  /** Mesma chave de `SITE_API_KEY` da API (ADR-0009). */
  SITE_API_KEY: z.string().min(32),
  /** Proxies confiáveis na frente do site; o IP do visitante é a entrada dessa posição, da direita. */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
});

export type SiteEnv = z.infer<typeof SiteEnvSchema>;

/** Lê o ambiente do site. A mensagem cita só os nomes das variáveis, nunca os valores. */
export function loadSiteEnv(source: Readonly<Record<string, string | undefined>>): SiteEnv {
  const result = SiteEnvSchema.safeParse(source);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(`Configuração do site inválida: ${names.join(', ')}`);
  }
  return result.data;
}
```

`apps/site/src/server/client-ip.ts`:

```ts
import * as z from 'zod';

const IpSchema = z.union([z.ipv4(), z.ipv6()]);

/**
 * IP do visitante em `X-Forwarded-For`. Cada proxy acrescenta à direita, então só a entrada escrita
 * pelo proxy confiável mais externo é confiável; as da esquerda o cliente escreve como quiser.
 */
export function clientIpFrom(forwardedFor: string | null, hops: number): string | null {
  if (forwardedFor === null || hops < 1) {
    return null;
  }
  const entries = forwardedFor.split(',').map((entry) => entry.trim()).filter(Boolean);
  const candidate = entries[entries.length - hops];
  const parsed = IpSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
```

`apps/site/src/app/beta/state.ts`:

```ts
export type WaitlistField = 'email' | 'privacyAccepted';

export type WaitlistState =
  | { readonly status: 'idle' }
  | { readonly status: 'accepted' }
  | {
      readonly status: 'invalid';
      readonly errors: Partial<Record<WaitlistField, string>>;
      readonly email: string;
    }
  | { readonly status: 'rate-limited' }
  | { readonly status: 'failed' };

export const INITIAL_STATE: WaitlistState = { status: 'idle' };
```

`apps/site/src/server/join-waitlist.ts`:

```ts
import type { Logger } from '@zooloo/security';
import { WaitlistSignupSchema } from '@zooloo/validation';
import type { WaitlistField, WaitlistState } from '../app/beta/state.ts';
import { PRIVACY_VERSION } from '../content/legal.ts';
import type { SiteEnv } from './env.ts';

export interface JoinDeps {
  readonly env: SiteEnv;
  readonly clientIp: string | null;
  readonly fetch: typeof fetch;
  readonly logger: Logger;
}

const API_TIMEOUT_MS = 5_000;

/** Valida o formulário e repassa à API (ADR-0009). Nunca loga o e-mail. */
export async function joinWaitlist(formData: FormData, deps: JoinDeps): Promise<WaitlistState> {
  const email = String(formData.get('email') ?? '');
  const parsed = WaitlistSignupSchema.safeParse({
    email,
    privacyAccepted: formData.get('privacyAccepted') === 'on',
    marketingOptIn: formData.get('marketingOptIn') === 'on',
    privacyVersion: PRIVACY_VERSION,
    website: String(formData.get('website') ?? ''),
  });
  if (!parsed.success) {
    const errors: Partial<Record<WaitlistField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === 'email' || field === 'privacyAccepted') && errors[field] === undefined) {
        errors[field] = issue.message;
      }
    }
    return { status: 'invalid', errors, email };
  }

  const headers: Record<string, string> = {
    authorization: `Bearer ${deps.env.SITE_API_KEY}`,
    'content-type': 'application/json',
  };
  if (deps.clientIp !== null) {
    headers['x-client-ip'] = deps.clientIp;
  }
  try {
    const response = await deps.fetch(`${deps.env.API_URL}/api/v1/waitlist`, {
      method: 'POST',
      headers,
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (response.status === 202) {
      return { status: 'accepted' };
    }
    if (response.status === 429) {
      return { status: 'rate-limited' };
    }
    deps.logger.error('lista de espera: API recusou', { status: response.status });
  } catch (err) {
    deps.logger.error('lista de espera: API inacessível', { err });
  }
  return { status: 'failed' };
}
```

`apps/site/src/server/logger.ts`:

```ts
import { createLogger, stdoutSink } from '@zooloo/security';

/** Logger mascarado do site (SEC-LOG-01). */
export const logger = createLogger({ sink: stdoutSink, level: 'info' });
```

`apps/site/src/app/beta/actions.ts`:

```ts
'use server';

import { headers } from 'next/headers';
import { clientIpFrom } from '../../server/client-ip.ts';
import { loadSiteEnv } from '../../server/env.ts';
import { joinWaitlist } from '../../server/join-waitlist.ts';
import { logger } from '../../server/logger.ts';
import type { WaitlistState } from './state.ts';

export async function joinWaitlistAction(
  _previous: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const env = loadSiteEnv(process.env);
  const clientIp = clientIpFrom((await headers()).get('x-forwarded-for'), env.TRUSTED_PROXY_HOPS);
  return joinWaitlist(formData, { env, clientIp, fetch, logger });
}
```

- [ ] **Step 4: Teste do formulário**

`apps/site/src/app/beta/WaitlistForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe.ts';
import type { WaitlistState } from './state.ts';
import { WaitlistForm } from './WaitlistForm.tsx';

const actionReturning = (state: WaitlistState) =>
  vi.fn((_: WaitlistState, __: FormData) => Promise.resolve(state));

describe('WaitlistForm', () => {
  it('campos rotulados, novidades desmarcadas e honeypot fora da navegação', async () => {
    const { container } = render(<WaitlistForm action={actionReturning({ status: 'accepted' })} />);
    expect(screen.getByLabelText('E-mail')).toHaveProperty('required', true);
    expect(screen.getByLabelText('Li e aceito a política de privacidade')).toHaveProperty('required', true);
    expect(
      screen.getByLabelText('Quero receber novidades do Zooloo por e-mail (opcional)'),
    ).toHaveProperty('checked', false);
    const honeypot = container.querySelector<HTMLInputElement>('input[name="website"]');
    expect(honeypot?.tabIndex).toBe(-1);
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('confirmação neutra depois de enviar', async () => {
    const action = actionReturning({ status: 'accepted' });
    render(<WaitlistForm action={action} />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@example.test');
    await userEvent.click(screen.getByLabelText('Li e aceito a política de privacidade'));
    await userEvent.click(screen.getByRole('button', { name: 'Entrar na lista' }));
    expect(await screen.findByRole('status')).toHaveProperty(
      'textContent',
      'Pronto! Avisaremos quando sua vaga abrir.',
    );
    expect(action).toHaveBeenCalledOnce();
  });

  it('erro de campo ligado ao input e e-mail preservado', async () => {
    const action = actionReturning({
      status: 'invalid',
      errors: { email: 'Informe um e-mail válido.' },
      email: 'ana',
    });
    render(<WaitlistForm action={action} />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana');
    await userEvent.click(screen.getByLabelText('Li e aceito a política de privacidade'));
    await userEvent.click(screen.getByRole('button', { name: 'Entrar na lista' }));
    const input = await screen.findByLabelText('E-mail');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Informe um e-mail válido.').id).toBe(input.getAttribute('aria-describedby'));
    expect((input as HTMLInputElement).value).toBe('ana');
  });

  it.each([
    [{ status: 'rate-limited' } as const, 'Muitas tentativas. Tente de novo mais tarde.'],
    [{ status: 'failed' } as const, 'Não foi possível enviar agora. Tente de novo em alguns minutos.'],
  ])('%o mostra alerta', async (state, message) => {
    render(<WaitlistForm action={actionReturning(state)} />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@example.test');
    await userEvent.click(screen.getByLabelText('Li e aceito a política de privacidade'));
    await userEvent.click(screen.getByRole('button', { name: 'Entrar na lista' }));
    expect((await screen.findByRole('alert')).textContent).toBe(message);
  });
});
```

- [ ] **Step 5: Implementar o formulário e a página**

`apps/site/src/app/beta/WaitlistForm.tsx`:

```tsx
'use client';

import { t } from '@zooloo/i18n';
import { useActionState } from 'react';
import { INITIAL_STATE, type WaitlistState } from './state.ts';
import styles from './WaitlistForm.module.css';

export interface WaitlistFormProps {
  readonly action: (previous: WaitlistState, formData: FormData) => Promise<WaitlistState>;
}

/** Formulário da lista de espera. Funciona sem JavaScript: `action` é uma Server Action. */
export function WaitlistForm({ action }: WaitlistFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  if (state.status === 'accepted') {
    return (
      <p role="status" className={styles.success}>
        {t('site.waitlist.accepted')}
      </p>
    );
  }

  const errors = state.status === 'invalid' ? state.errors : {};
  return (
    <form action={formAction} className={styles.form}>
      {state.status === 'rate-limited' && (
        <p role="alert" className={styles.alert}>
          {t('site.waitlist.rateLimited')}
        </p>
      )}
      {state.status === 'failed' && (
        <p role="alert" className={styles.alert}>
          {t('site.waitlist.failed')}
        </p>
      )}

      <label htmlFor="email">{t('site.waitlist.email')}</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        defaultValue={state.status === 'invalid' ? state.email : ''}
        aria-invalid={errors.email ? true : undefined}
        aria-describedby={errors.email ? 'email-erro' : undefined}
      />
      {errors.email && (
        <p id="email-erro" className={styles.error}>
          {errors.email}
        </p>
      )}

      <div className={styles.check}>
        <input
          id="privacyAccepted"
          name="privacyAccepted"
          type="checkbox"
          required
          aria-invalid={errors.privacyAccepted ? true : undefined}
          aria-describedby={errors.privacyAccepted ? 'privacidade-erro' : undefined}
        />
        <label htmlFor="privacyAccepted">{t('site.waitlist.privacyConsent')}</label>
        <a href="/privacidade">{t('site.nav.privacy')}</a>
      </div>
      {errors.privacyAccepted && (
        <p id="privacidade-erro" className={styles.error}>
          {errors.privacyAccepted}
        </p>
      )}

      <div className={styles.check}>
        <input id="marketingOptIn" name="marketingOptIn" type="checkbox" />
        <label htmlFor="marketingOptIn">{t('site.waitlist.marketingConsent')}</label>
      </div>

      {/* Honeypot: invisível e fora da navegação; pessoas não preenchem. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">{t('site.waitlist.honeypot')}</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t('site.waitlist.submitting') : t('site.waitlist.submit')}
      </button>
    </form>
  );
}
```

O link da política fica fora do `<label>` para o nome acessível da caixa ser exatamente o texto do catálogo.

`apps/site/src/app/beta/WaitlistForm.module.css`:

```css
.form {
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}

.form input[type='email'] {
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--zl-border);
  border-radius: var(--zl-radius-md);
  background: var(--zl-surface);
  color: var(--zl-text);
  font: inherit;
}

.check {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.error {
  margin: 0;
  color: var(--zl-danger-text);
  font-size: var(--zl-text-sm);
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: var(--zl-radius-md);
  background: var(--zl-danger-surface);
  color: var(--zl-danger-text);
}

.success {
  padding: 1rem;
  border-radius: var(--zl-radius-md);
  background: var(--zl-success-surface);
  color: var(--zl-success-text);
  font-weight: 600;
}

.submit {
  justify-self: start;
  padding: 0.75rem 1.25rem;
  border: 0;
  border-radius: var(--zl-radius-md);
  background: var(--zl-primary);
  color: var(--zl-on-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.7;
  cursor: progress;
}

/* Fora da tela, mas no DOM para robôs que preenchem tudo. */
.honeypot {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
```

(Conferir nomes de variáveis de perigo/sucesso em `themes.ts`.)

`apps/site/src/app/beta/page.tsx`:

```tsx
import { t } from '@zooloo/i18n';
import type { Metadata } from 'next';
import { joinWaitlistAction } from './actions.ts';
import { WaitlistForm } from './WaitlistForm.tsx';

export const metadata: Metadata = { title: 'Beta' };

export default function BetaPage() {
  return (
    <section>
      <h1>{t('site.waitlist.title')}</h1>
      <p>{t('site.waitlist.lead')}</p>
      <WaitlistForm action={joinWaitlistAction} />
    </section>
  );
}
```

- [ ] **Step 6: Verificar**

Run: `pnpm --filter @zooloo/site test:coverage && pnpm --filter @zooloo/site typecheck && pnpm turbo run build --filter=@zooloo/site... && pnpm lint && pnpm depcruise`
Expected: PASS, cobertura ≥ 70%.

- [ ] **Step 7: Commit**

```bash
git add apps/site
git commit -m "feat(site): beta waitlist form with Server Action and progressive enhancement"
```

---

### Task 12: `pnpm dev:worktree site`

**Files:**
- Modify: `tools/dev-worktree/src/worktree.ts`, `worktree.test.ts`, `env-file.ts`, `env-file.test.ts`, `cli.ts`; `AGENTS.md` (linha do comando)

**Interfaces:**
- Produces: `WorktreePorts.site = postgres + 4`; `.env.worktree` com `SITE_API_KEY`, `ZL_SITE_PORT`; comando `site`.

- [ ] **Step 1: Testes**

`worktree.test.ts`, no teste que verifica `ports.web`: adicionar `expect(ports.site).toBe(ports.postgres + 4);`.

`env-file.test.ts`: `const ports = { postgres: 21230, redis: 21231, api: 21232, web: 21233, site: 21234 };` e no teste do render:

```ts
    expect(text).toContain('ZL_SITE_PORT=21234\n');
    expect(text).toMatch(/^SITE_API_KEY=.{32,}$/m);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @zooloo/dev-worktree test`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`worktree.ts`: `readonly site: number;` em `WorktreePorts` e `return { postgres, redis: postgres + 1, api: postgres + 2, web: postgres + 3, site: postgres + 4 };`.

`env-file.ts`: constante

```ts
/** Chave do site local para `POST /waitlist` (ADR-0009). Só desenvolvimento. */
export const DEV_SITE_API_KEY = 'dev-only-site-api-key-0000000000000000';
```

e, nas `lines`, depois de `DEV_AUTH=true`: `` `SITE_API_KEY=${DEV_SITE_API_KEY}`, `` e depois de `ZL_WEB_PORT`: `` `ZL_SITE_PORT=${ports.site}`, ``.

`cli.ts`:
- Comentário do topo: `[up|api|web|site|down|status]`; sem argumento: `up`, `api`, `web` e `site`.
- `status()`: `print(\`site       http://127.0.0.1:${ports.site}/\`);`
- Nova função:

```ts
/** Next.js do site na porta da worktree, apontando para a API desta worktree. */
function site(): void {
  const next = spawn(
    process.execPath,
    [join(root, 'apps', 'site', 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--port', String(ports.site), '--hostname', '127.0.0.1'],
    {
      stdio: 'inherit',
      cwd: join(root, 'apps', 'site'),
      env: {
        ...childEnv,
        API_URL: `http://127.0.0.1:${ports.api}`,
        SITE_API_KEY: DEV_SITE_API_KEY,
        TRUSTED_PROXY_HOPS: '1',
      },
      shell: false,
    },
  );
  children.push(next);
}
```

- `switch`: `case 'site': site(); break;`; em `case 'dev'` chamar `site();` depois de `web();`; mensagem de erro: `Use up, api, web, site, down ou status.`
- Importar `DEV_SITE_API_KEY` de `./env-file.js`.
- O build do `dev:worktree` (package.json raiz) já compila a API; acrescentar `--filter=@zooloo/site^...` para os pacotes que o site lê de `dist/`:
  `"dev:worktree": "turbo run build --filter=@zooloo/dev-worktree... --filter=@zooloo/api... --filter=@zooloo/site^... --output-logs=errors-only && node tools/dev-worktree/dist/cli.js"`

`AGENTS.md`: comando vira `pnpm dev:worktree [up|api|web|site|down|status]` com "web-app e site".

- [ ] **Step 4: Verificar de verdade**

Run: `pnpm --filter @zooloo/dev-worktree test:coverage && pnpm dev:worktree up && pnpm dev:worktree status`
Depois, em segundo plano, `pnpm dev:worktree api` e `pnpm dev:worktree site`; enviar o formulário em `http://127.0.0.1:<site>/beta` com `curl`:

```bash
curl -s -X POST "http://127.0.0.1:<api>/api/v1/waitlist" -H "authorization: Bearer dev-only-site-api-key-0000000000000000" -H "content-type: application/json" -d '{"email":"teste@example.test","privacyAccepted":true,"privacyVersion":"2026-11-23"}' -w ' %{http_code}\n'
```

Expected: `{"status":"accepted"} 202`.

- [ ] **Step 5: Commit**

```bash
git add tools/dev-worktree package.json AGENTS.md
git commit -m "feat(tools): dev:worktree site command with local site key"
```

---

### Task 13: E2E do site (Playwright) e capturas

**Files:**
- Create: `apps/site/playwright.config.ts`, `apps/site/e2e/site.spec.ts`
- Modify: `apps/site/package.json` (nada se `test:e2e` já existe), `eslint.config.mjs` (se o bloco de testes precisar incluir `apps/site/e2e/**/*.ts`)

**Interfaces:**
- Consumes: site (Tasks 9–11), API e `.env.worktree` (Tasks 8, 12).

- [ ] **Step 1: Configuração**

`apps/site/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

/**
 * E2E do site contra o build standalone de produção. Envio da lista de espera precisa da API da
 * worktree (`pnpm dev:worktree up`); sem `.env.worktree`, esses testes são pulados.
 */
const PORT = 4179;
const channels = (process.env['PLAYWRIGHT_CHANNELS'] ?? 'chrome,msedge').split(',');

const ENV_FILE = new URL('../../.env.worktree', import.meta.url);
// Caminho fixo: raiz do repositório + nome constante.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const envText = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
const apiPort = /^PORT=(\d+)$/m.exec(envText)?.[1];
const siteKey = /^SITE_API_KEY=(.+)$/m.exec(envText)?.[1];
if (apiPort) {
  process.env['ZL_E2E_API_PORT'] = apiPort;
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: channels.map((channel) => ({
    name: channel,
    use: { ...devices['Desktop Chrome'], ...(channel === 'chromium' ? {} : { channel }) },
  })),
  webServer: [
    {
      command: 'pnpm build && node .next/standalone/apps/site/server.js',
      env: {
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
        API_URL: apiPort ? `http://127.0.0.1:${apiPort}` : 'http://127.0.0.1:9',
        SITE_API_KEY: siteKey ?? 'e2e-sem-api-'.padEnd(40, '0'),
        TRUSTED_PROXY_HOPS: '1',
      },
      url: `http://127.0.0.1:${PORT}/`,
      reuseExistingServer: false,
      timeout: 300_000,
    },
    ...(apiPort
      ? [
          {
            command: 'node --env-file=../../.env.worktree ../api/dist/main.js',
            url: `http://127.0.0.1:${apiPort}/api/v1/health/ready`,
            reuseExistingServer: true,
            timeout: 60_000,
          },
        ]
      : []),
  ],
});
```

- [ ] **Step 2: Testes**

`apps/site/e2e/site.spec.ts`:

```ts
import { expect, type Page, test } from '@playwright/test';

const withApi = Boolean(process.env['ZL_E2E_API_PORT']);
let ipSeq = Math.floor(Math.random() * 200) + 1;
/** IP de documentação novo por teste: o limite de 5/h por IP não acumula entre execuções. */
const freshIp = (): string => `203.0.113.${(ipSeq++ % 250) + 1}`;
const freshEmail = (): string => `e2e-${Date.now()}-${ipSeq}@example.test`;

function collectCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });
  return violations;
}

test('páginas públicas abrem sem violação de CSP e com cabeçalhos de segurança', async ({ page }) => {
  const violations = collectCspViolations(page);
  for (const path of ['/', '/beta', '/termos', '/privacidade']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    const csp = response?.headers()['content-security-policy'] ?? '';
    expect(csp, path).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp, path).not.toContain('unsafe-inline');
    expect(response?.headers()['strict-transport-security'], path).toContain('max-age=');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  expect(violations).toEqual([]);
});

test('nonce muda a cada requisição', async ({ request }) => {
  const nonce = async () =>
    /'nonce-([^']+)'/.exec((await request.get('/')).headers()['content-security-policy'] ?? '')?.[1];
  expect(await nonce()).not.toBe(await nonce());
});

test('404 próprio', async ({ page }) => {
  const response = await page.goto('/nao-existe');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});

test('links do rodapé levam aos documentos legais', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacidade' }).click();
  await expect(page).toHaveURL(/\/privacidade$/);
  await expect(page.getByText('Versão preliminar — revisão jurídica pendente.')).toBeVisible();
});

test.describe('lista de espera', () => {
  test.skip(!withApi, 'precisa da API da worktree (pnpm dev:worktree up)');

  test('com JavaScript: envia e mostra a confirmação neutra', async ({ browser }) => {
    const context = await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': freshIp() } });
    const page = await context.newPage();
    const violations = collectCspViolations(page);
    await page.goto('/beta');
    await page.getByLabel('E-mail').fill(freshEmail());
    await page.getByLabel('Li e aceito a política de privacidade').check();
    await page.getByRole('button', { name: 'Entrar na lista' }).click();
    await expect(page.getByRole('status')).toHaveText('Pronto! Avisaremos quando sua vaga abrir.');
    expect(violations).toEqual([]);
    await context.close();
  });

  test('sem JavaScript: o formulário HTML também grava', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      extraHTTPHeaders: { 'x-forwarded-for': freshIp() },
    });
    const page = await context.newPage();
    await page.goto('/beta');
    await page.getByLabel('E-mail').fill(freshEmail());
    await page.getByLabel('Li e aceito a política de privacidade').check();
    await page.getByRole('button', { name: 'Entrar na lista' }).click();
    await expect(page.getByText('Pronto! Avisaremos quando sua vaga abrir.')).toBeVisible();
    await context.close();
  });

  test('mesmo e-mail duas vezes: mesma confirmação', async ({ browser }) => {
    const context = await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': freshIp() } });
    const page = await context.newPage();
    const email = freshEmail();
    for (let round = 0; round < 2; round += 1) {
      await page.goto('/beta');
      await page.getByLabel('E-mail').fill(email);
      await page.getByLabel('Li e aceito a política de privacidade').check();
      await page.getByRole('button', { name: 'Entrar na lista' }).click();
      await expect(page.getByRole('status')).toHaveText('Pronto! Avisaremos quando sua vaga abrir.');
    }
    await context.close();
  });
});
```

- [ ] **Step 3: Rodar**

Run: `pnpm dev:worktree up && pnpm --filter @zooloo/site test:e2e`
Expected: todos PASS em `chrome` e `msedge`. Se algum teste de CSP falhar por estilo inline do Next/next-font, investigar com `superpowers:systematic-debugging` antes de relaxar a política; relaxar a CSP é mudança de regra de segurança e exige pessoa.

- [ ] **Step 4: Capturas nos dois temas**

Com o servidor de produção do Step 3 no ar (ou `pnpm --filter @zooloo/site start` com o env do Playwright), para cada página (`/`, `/beta`, `/privacidade`) e cada tema:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --window-size=1280,900 --blink-settings=preferredColorScheme=1 --screenshot="$SCRATCH/site-home-claro.png" http://127.0.0.1:4179/
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --window-size=1280,900 --blink-settings=preferredColorScheme=0 --screenshot="$SCRATCH/site-home-escuro.png" http://127.0.0.1:4179/
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --window-size=390,844 --blink-settings=preferredColorScheme=1 --screenshot="$SCRATCH/site-home-estreito.png" http://127.0.0.1:4179/
```

(`$SCRATCH` = diretório de rascunho da sessão; `preferredColorScheme=0` escuro, `1` claro.) Abrir cada PNG e corrigir problemas visuais (contraste, espaçamento, quebra em tela estreita) antes do commit.

- [ ] **Step 5: Commit**

```bash
git add apps/site
git commit -m "test(site): Playwright E2E for CSP, legal pages and waitlist with and without JS"
```

---

### Task 14: Documentação

**Files:**
- Create: `docs/design-docs/adr-0009-site-publico.md`
- Modify: `docs/design-docs/index.md`, `ARCHITECTURE.md`, `docs/exec-plans/active/fase-0-fundacao.md`, `docs/exec-plans/tech-debt-tracker.md`

- [ ] **Step 1: ADR-0009**

```markdown
# ADR-0009 — Site público em Next.js e lista de espera pela API

- Status: aceito
- Data: 2026-11-23

## Contexto

O MVP precisa de landing, lista de espera do beta, termos e privacidade (doc 11 §4.3). O site é
Next.js (doc 09 §2.2). A lista grava e-mail (C2) e consentimento de marketing (RNF-LGPD-05).

## Decisões

1. **Servidor Next.js 16 (`output: "standalone"`)**, todas as páginas por requisição: o nonce da
   CSP só existe com requisição. CSP com `'nonce-…' 'strict-dynamic'`, sem `unsafe-inline` em
   produção, gerada em `apps/site/src/proxy.ts`.
2. **Formulário por Server Action** com `useActionState`: funciona sem JavaScript; sem CORS, porque
   o navegador nunca chama a API.
3. **Lista gravada pela API** (`POST /api/v1/waitlist`) em `waitlist_entries`, com RLS forçada e
   `zooloo_app` só com INSERT: a aplicação grava e não lê. Sem IP nem user agent.
4. **Chave do site** (`SITE_API_KEY`, ≥ 32 caracteres, `timingSafeEqual`). Só com ela a API lê
   `X-Client-Ip`.
5. **IP do visitante**: entrada de `X-Forwarded-For` na posição `TRUSTED_PROXY_HOPS` contada da
   direita (padrão 1). A primeira entrada é do cliente e não é usada. Sem proxy que acrescente o IP,
   o cliente controla o valor; o limite global por chave segura o abuso até a infraestrutura
   (passo 16) colocar o proxy.
6. **Rate limit** (SEC-AP-04) por porta `RateLimiter`: Redis (janela fixa, `INCR` + `EXPIRE NX`)
   e memória sem `REDIS_URL`. 5/h por IP, 120/min por chave. Falha fechada (503).
7. **Resposta sempre 202 igual** para novo, repetido e honeypot (mesma lógica do SEC-ID-07).
8. **Exceção ao SEC-AP-05**: sem `Idempotency-Key`. O e-mail é a chave natural (índice único em
   `lower(email)` + `ON CONFLICT DO NOTHING`). Aprovado por pessoa em 2026-11-23.
9. **`@zooloo/ui-web`** (só `src/`, consumido por Vite e Next) guarda o `<ZoolooLogo>`; o gerador
   de CSS dos tokens fica em `@zooloo/ui-tokens`, porque roda em Node no build (fecha TD-014).
10. **Termos e privacidade em rascunho** escrito a partir dos docs 04 e 10, com aviso de versão
    preliminar. Publicação em produção bloqueada até revisão jurídica (TD-024).

## Consequências

- O site precisa de runtime Node na hospedagem (passo 16).
- Sem double opt-in até existir provedor de e-mail (TD-025).
- E2E do site ainda fora do CI (TD-026, mudança de CI exige revisão humana).
```

`docs/design-docs/index.md`: linha `| [adr-0009-site-publico.md](adr-0009-site-publico.md) | aceito | 2026-11-23 |`.

- [ ] **Step 2: ARCHITECTURE, plano e dívidas**

`ARCHITECTURE.md`:
- `apps/site`: status `ativo`; "Next.js 16 standalone: landing, lista de espera do beta (Server Action → API), termos e privacidade em rascunho; CSP com nonce (ADR-0009)".
- Nova linha `packages/ui-web` | ativo | "Componentes React dos apps web (`<ZoolooLogo>`); só `src/`, compilado por Vite e Next (ADR-0009)".
- `packages/db-schema`: incluir `waitlist_entries` (só INSERT para a aplicação).
- `apps/api`: incluir `POST /waitlist` e rate limit (Redis).
- `packages/ui-tokens`: incluir "gerador de CSS (`tokensCss`)".

`docs/exec-plans/active/fase-0-fundacao.md`:
- Passo 15: `feito (ADR-0009); revisão jurídica (TD-024), double opt-in (TD-025) e E2E no CI (TD-026) pendentes`.
- Log `- **2026-11-23** — Passo 15 (ADR-0009). …` com números reais da execução (testes por pacote, cobertura, E2E Chrome/Edge, achados corrigidos).

`docs/exec-plans/tech-debt-tracker.md`:
- TD-014: remover a linha (resolvida) ou marcar "resolvida no passo 15 (ADR-0009)", conforme o padrão do arquivo para dívidas fechadas.
- TD-009: atualizar — rate limit existe só em `POST /waitlist`; falta nas demais rotas; `Idempotency-Key` e CORS seguem pendentes.
- Novas:

```markdown
| TD-024 | **Bloqueia produção do site.** Termos e política de privacidade são rascunho do agente: falta revisão jurídica, contato do encarregado (DPO), e-mail de contato, foro e operadores reais | ADR-0009 | alta (antes de publicar) |
| TD-025 | Lista de espera sem double opt-in: confirmar o e-mail quando houver provedor de e-mail (workers, doc 11 §4.4) | ADR-0009 | média |
| TD-026 | E2E do site (`apps/site/e2e`) fora do CI: incluir job ao lado do E2E do web-app (exige revisão humana do CI) | ADR-0009 | média |
```

- [ ] **Step 3: Verificar e commitar**

Run: `pnpm format:check`
Expected: PASS.

```bash
git add docs ARCHITECTURE.md
git commit -m "docs: ADR-0009 public site, Fase 0 step 15 and new tech debt"
```

---

### Task 15: Verificação final

- [ ] **Step 1: Gates completos**

Run: `pnpm check`
Expected: PASS (formatação, lint, arquitetura, tipos, testes com cobertura).

- [ ] **Step 2: E2E**

Run: `pnpm dev:worktree up && pnpm --filter @zooloo/web-app test:e2e && pnpm --filter @zooloo/site test:e2e`
Expected: PASS em Chrome e Edge (o web-app confirma que a troca do logo e do CSS de tokens não quebrou nada).

- [ ] **Step 3: OpenAPI e migrações sem diferença pendente**

Run: `pnpm build && pnpm --filter @zooloo/api openapi && pnpm --filter @zooloo/db-schema db:generate && git status --short`
Expected: nada novo além do já commitado.

- [ ] **Step 4: Relatório**

Resumo para a pessoa: o que entrou, números dos testes, desvios da spec (seção "Desvios" deste plano), partes de risco alto que pedem revisão (migração/RLS de `waitlist_entries`, exceção ao SEC-AP-05, cabeçalho de IP) e dívidas TD-024..026.
