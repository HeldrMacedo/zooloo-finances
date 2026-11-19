# Arquitetura

Fonte normativa: `docs/product-specs/09-arquitetura-e-stack.md` (stack) e `docs/product-specs/12-modo-de-desenvolvimento-harness-engineering.md` §5 (camadas).

## Pacotes e apps

| Caminho | Status | Papel |
|---|---|---|
| `packages/domain` | ativo | Regras de negócio puras, sem I/O: `Money`, `LocalDate`, parcelas, ciclo de fatura, orçamento |
| `packages/ui-tokens` | ativo | Tokens da marca (doc 13 §6), temas claro/escuro, teste de contraste |
| `packages/sync-core` | planejado | Outbox, pull/push, HLC, merge por campo |
| `packages/db-schema` | ativo | Drizzle: PostgreSQL com RLS (`users`, `profiles`, `categories`) e SQLite local espelhado; migrações em `migrations/` (ADR-0005) |
| `packages/validation` | ativo | Schemas Zod da fronteira: primitivos (`IdSchema` UUIDv7, `LocalDateSchema`, `MoneySchema`, cursor), categorias, problem+json (RFC 9457) |
| `packages/security` | ativo | Logger estruturado com mascaramento (SEC-LOG-01); criptografia e sanitização planejadas |
| `packages/api-client` | planejado | Cliente tipado gerado do OpenAPI |
| `packages/i18n` | ativo | Catálogo pt-BR tipado com plural, `formatMoney`/`parseMoneyInput` sem float, `formatLocalDate` |
| `apps/api` | ativo | NestJS 12 + Fastify (ADR-0002): `/api/v1`, health, OpenAPI dos schemas Zod, problem+json, helmet; sync e SSE planejados |
| `apps/workers` | planejado | BullMQ: recorrências, e-mails, jobs LGPD |
| `apps/web-app` | ativo | Vite 8 + React 19 em `/app/`: app shell (topbar, menu lateral), componentes base, temas claro/escuro/automático, modo privado, atalhos `/` e `N`, manifest e ícones provisórios; Service Worker e banco local na PoC 1 |
| `apps/site` | planejado | Next.js: landing, termos, privacidade |
| `apps/mobile`, `apps/kids`, `apps/mcp` | reservado | Fases 2, 4 e 5 |
| `tools/dev-worktree` | ativo | `pnpm dev:worktree`: Docker Compose por worktree (`infra/dev`), migrações, seed sintético, `.env.worktree`, API em watch |
| `tools/vitest-config` | ativo | Configuração compartilhada do Vitest e metas de cobertura por camada |

## Resolução de pacotes internos

Em dev e teste os pacotes são lidos de `src/` pela condição de export `@zooloo/source`; o build usa `dist/` (ADR-0004).

## Regras de dependência (verificadas no CI)

- `packages/domain` não importa nada fora de si (ESLint `no-restricted-imports` + dependency-cruiser `domain-sem-io`).
- Apps não importam outros apps; pacotes não importam apps; sem ciclos (`.dependency-cruiser.cjs`).
- Dentro de cada domínio de negócio: `Types → Config → Repo → Service → Runtime → UI`, com `Providers` como única porta para o transversal (doc 12 §5.1). As regras por camada entram junto com o primeiro app.

## API (`apps/api`)

- Camadas no app: `config/` (env validado com Zod), `providers/` (banco, logging: única porta para o transversal), `runtime/http/` (filtro problem+json, validação), `modules/<domínio>/` (controllers e services).
- Validação na fronteira: `@Body({ schema: XxxSchema })` com schemas de `@zooloo/validation`; o pipe global (`StandardSchemaValidationPipe`) responde 422 em problem+json.
- Acesso a dados do usuário só por `DatabaseService.withUser(userId, tx => …)`, que abre a transação no contexto da RLS.
- OpenAPI gerado dos controllers e dos schemas Zod (`standardSchema`). Mudou a API? `pnpm build && pnpm --filter @zooloo/api openapi` e versione `apps/api/openapi.json`; o CI falha se divergir.

## Web-app (`apps/web-app`)

- `src/ui/`: componentes do design system (Button, TextField, Card, Amount, ZoolooLogo, SyncStatus) e contextos de tema e privacidade. Cores só por variáveis `--zl-*`, geradas de `@zooloo/ui-tokens` no build (`build/tokens-css.ts`, módulo `virtual:zooloo-tokens.css`); nada de hex solto em CSS.
- `src/app/`: shell, rotas e páginas. Telas do menu ainda não construídas usam `ComingSoonPage`.
- Valor monetário na tela só por `<Amount>` (sinal, cor e nome acessível de entrada/saída; modo privado).
- Ícones e logotipo provisórios (doc 13 §7.1): `pnpm --filter @zooloo/web-app icons` gera `public/icons/`; a troca pelos vetores definitivos acontece só em `scripts/provisional-mark.ts` e `src/ui/brand/ZoolooLogo.tsx`.
- Vitrine do design system em `/app/design` e PoC do banco local em `/app/dev/banco-local`, só em desenvolvimento e no build de E2E.
- Banco local (ADR-0006): `src/data/local-db/`. SQLite WASM em Web Worker (`opfs-sahpool`), aba líder por Web Locks, demais abas pelo BroadcastChannel, Drizzle `sqlite-proxy` via `useLocalDb().orm`. Tabelas e migrações de `@zooloo/db-schema/local`.
- Service Worker (`src/sw.ts`, Serwist): precache do app shell, sem cache de `/api` (RNF-PWA-04).
- E2E: `pnpm --filter @zooloo/web-app test:e2e` (Playwright, build de produção com `--mode e2e`).

## Banco de dados

- PostgreSQL: papéis `zooloo_owner` (migrações) e `zooloo_app` (aplicação, sujeito à RLS). Toda transação começa com `userContext(userId)`.
- Toda tabela do schema `public` tem RLS ativa e forçada; teste estrutural em `packages/db-schema/src/pg/rls.test.ts`.
- Mudou o esquema? `pnpm --filter @zooloo/db-schema db:generate` e versione as migrações; o CI falha se faltar.

## Núcleo de domínio

| Módulo | Regras |
|---|---|
| `money.ts` | RNF-FIN-01: centavos inteiros seguros + ISO 4217; operações recusam moedas diferentes |
| `local-date.ts` | RNF-FIN-02, RN-LAN-14: datas sem fuso; soma de meses leva dia 29–31 ao fim do mês curto |
| `rounding.ts` | RNF-FIN-04: divisão half-even |
| `installments.ts` | RN-LAN-11: parcelas truncadas, resíduo na 1ª |
| `card-invoice.ts` | RN-CRT-02, RN-CRT-03: fatura pela regra de fechamento |
| `budget.ts` | RN-ORC-06, RN-ORC-08: indicadores do orçamento |
