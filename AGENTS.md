# Zooloo Finanças — guia para agentes

Mapa, não manual (doc 12 §3). Detalhes ficam nos documentos apontados abaixo.

## Como trabalhar
- Leia a tarefa e o plano em `docs/exec-plans/active/` (se houver). Fase atual: **Fase 0** (`docs/exec-plans/active/fase-0-fundacao.md`).
- Use só dados sintéticos. Nunca dados reais nem credenciais de produção (doc 12 §9).
- Teste primeiro em regras de domínio (Vitest + fast-check para invariantes).
- Rode `pnpm check` (formatação, lint, arquitetura, tipos, testes com cobertura) antes de abrir PR.
- No núcleo financeiro rode também `pnpm test:mutation` (Stryker, score ≥ 80%).
- Testes do `@zooloo/db-schema` sobem PostgreSQL com Testcontainers: Docker precisa estar rodando.
- Mudou tabela? `pnpm --filter @zooloo/db-schema db:generate` e versione as migrações.
- Mudou UI? Confira em `/app/design` (só em dev) nos dois temas; captura de tela: Chrome headless com `--screenshot` e `--blink-settings=preferredColorScheme=0|1`.
- Mudou rota da API? `pnpm build && pnpm --filter @zooloo/api openapi` e versione `apps/api/openapi.json`.
- Suba o ambiente da sua worktree: `pnpm dev:worktree` (PostgreSQL, Redis, migrações, seed sintético e API em watch). Portas e banco derivam do nome da worktree; veja com `pnpm dev:worktree status`. Encerre e apague com `pnpm dev:worktree down`.
- Escale para uma pessoa nos casos de `docs/design-docs/core-beliefs.md#escalar`.

## Comandos
- `pnpm install` — dependências (pnpm via corepack, Node 24+).
- `pnpm check` — todos os gates locais.
- `pnpm --filter @zooloo/domain test` — testes de um pacote.
- `pnpm format` — Prettier.
- `pnpm dev:worktree [up|api|web|down|status]` — ambiente local isolado (Docker), API e web-app.

## Onde procurar
- Arquitetura, camadas e pacotes: `ARCHITECTURE.md`
- Regras de negócio e requisitos: `docs/product-specs/index.md`
- Segurança (normativo): `docs/product-specs/10-seguranca-e-protecao-de-dados.md`
- Qualidade e metas de teste: `docs/QUALITY_SCORE.md` e doc 04 §7A
- Planos, decisões e dívida: `docs/exec-plans/`, `docs/design-docs/`
- Roadmap e escopo do MVP: `docs/product-specs/11-roadmap-e-mvp.md`
- Identidade visual e tokens: `docs/product-specs/13-identidade_visual.md`, `packages/ui-tokens`

## Invariantes que nunca mudam
- Dinheiro = `Money` em centavos inteiros (`@zooloo/domain`). Nunca float, `toFixed` ou `parseFloat`.
- Datas de negócio = `LocalDate`. `new Date()` só em adaptadores.
- `@zooloo/domain` não faz I/O nem importa outros pacotes.
- Apps não importam código de outro app.
- Validar toda entrada externa com Zod.
- Toda tabela de usuário com RLS.
- Logs só pelo logger mascarado de `@zooloo/security`; `console.*` é erro.
- Não alterar CI, gates, limites de cobertura ou regras de segurança sem revisão humana.
