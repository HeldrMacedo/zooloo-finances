# Plano — Fase 0: Fundação e harness

Fonte: `docs/product-specs/11-roadmap-e-mvp.md` §3. Risco: **alto** (gates, domínio, CI).

## Objetivo

Deixar o ambiente pronto para que agentes entreguem funcionalidades com segurança (doc 12).

## Critérios de saída (doc 11 §3)

- [ ] Um agente implementa, a partir de uma tarefa escrita, o CRUD de categorias, abre o PR e passa em todos os gates sem intervenção humana no código.
- [ ] PoCs aprovadas com ADR em `docs/design-docs/`.
- [ ] Tipografia do doc 13 §3 empacotada e ativos provisórios de marca (doc 13 §7.1) no lugar.
- [ ] Deploy para homologação automático; produção com aprovação humana.

## Passos

| # | Passo | Status |
|---|---|---|
| 1 | Monorepo pnpm + Turborepo, TS strict, ESLint, Prettier, Vitest, Stryker, dependency-cruiser | feito |
| 2 | Base de conhecimento: `AGENTS.md`, `CLAUDE.md`, `ARCHITECTURE.md`, docs migrados para `docs/product-specs/` | feito |
| 3 | `@zooloo/domain`: `Money`, `LocalDate`, half-even, parcelas, ciclo de fatura, orçamento | feito (início) |
| 4 | `@zooloo/ui-tokens` com temas e teste de contraste | feito (tokens); componentes base pendentes |
| 5 | CI (GitHub Actions) com `pnpm check`, mutação, varredura de segredos, SCA e SAST | feito (arquivo); validar no primeiro push |
| 6 | `@zooloo/security`: logger estruturado com mascaramento + teste de mascaramento (SEC-DEV-02) | pendente |
| 7 | `@zooloo/validation` (Zod) e `@zooloo/i18n` (pt-BR) | pendente |
| 8 | `@zooloo/db-schema`: Drizzle SQLite + PostgreSQL, teste estrutural "toda tabela de usuário tem RLS" | pendente |
| 9 | `apps/api` (NestJS + Fastify, ADR-0002) com health check, OpenAPI e teste de integração com Testcontainers | pendente |
| 10 | `pnpm dev:worktree`: API, PostgreSQL, Redis, web-app e observabilidade por worktree | pendente |
| 11 | `apps/web-app` (Vite + React) com app shell, componentes base (botão, campo, card, topbar, menu lateral), fontes WOFF2 e `<ZoolooLogo>` provisório | pendente |
| 12 | PoC 1 — PWA offline: sqlite-wasm `opfs-sahpool` + Drizzle proxy + aba líder (Web Locks) + instalação | pendente |
| 13 | PoC 2 — `sync-core` no PWA contra a API, com conflito e exclusão | pendente |
| 14 | PoC 3 — cifra local do PWA (SEC-CR-08), duas estratégias, ADR | pendente |
| 15 | `apps/site` (Next.js): landing, lista de espera, termos e privacidade | pendente |
| 16 | IaC de homologação/produção, secret manager, KMS, backups | pendente; região Brasil (ADR-0003), provedor em aberto |
| 17 | Tarefa-piloto: CRUD de categorias feito por agente ponta a ponta | pendente |

## Decisões em aberto (precisam de pessoa)

- Provedor de nuvem (região já decidida: Brasil, ADR-0003).

## Log

- **2026-11-18** — Passos 1–5. `git init`; docs 01–13 movidos para `docs/product-specs/` (README virou `index.md`). `pnpm check` verde: lint, dependency-cruiser, typecheck e testes. `@zooloo/domain`: 60 testes, cobertura 100% linhas/branches, mutação 89,14%. `@zooloo/ui-tokens`: 38 testes, cobertura 100%; todos os pares de texto dos temas claro e escuro ≥ 4,5:1. Regras de lint testadas com arquivo-sonda (import de I/O no domínio, `new Date()`, `toFixed`, `console`, non-null assertion): todas disparam. Decisões em ADR-0001.
- **2026-11-18** — Decisões do produto: Docker Desktop instalado; dono do CODEOWNERS @HeldrMacedo; API em NestJS + Fastify (ADR-0002); hospedagem no Brasil (ADR-0003).
