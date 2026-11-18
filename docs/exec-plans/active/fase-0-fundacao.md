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
| 6 | `@zooloo/security`: logger estruturado com mascaramento + teste de mascaramento (SEC-DEV-02) | feito (logger); criptografia pendente |
| 7 | `@zooloo/validation` (Zod) e `@zooloo/i18n` (pt-BR) | feito |
| 8 | `@zooloo/db-schema`: Drizzle SQLite + PostgreSQL, teste estrutural "toda tabela de usuário tem RLS" | feito (users, profiles, categories); demais tabelas entram com cada módulo |
| 9 | `apps/api` (NestJS + Fastify, ADR-0002) com health check, OpenAPI e teste de integração com Testcontainers | feito |
| 10 | `pnpm dev:worktree`: API, PostgreSQL, Redis, web-app e observabilidade por worktree | feito (API, PostgreSQL, Redis, seed); web-app entra no passo 11; observabilidade local pendente (10b) |
| 11 | `apps/web-app` (Vite + React) com app shell, componentes base (botão, campo, card, topbar, menu lateral), fontes WOFF2 e `<ZoolooLogo>` provisório | feito |
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
- **2026-11-18** — Passo 6. `@zooloo/security`: `createLogger` (sink injetável, níveis, `child`), `redact` por classificação do doc 10 §2 (C4 removido, C3/C2 mascarados, `Money` mascarado em qualquer chave, ciclos e profundidade), `maskText` (e-mail, JWT, Bearer em texto livre), `stdoutSink`. 90 testes, cobertura 100%, mutação 97,7%. A mutação revelou listas de chaves sem teste (corrigido com teste tabela normativo) e um vazamento real: IPv6 comprimido (`fe80::1`) saía inteiro; corrigido para nunca manter o grupo do host. `eslint-plugin-security` ativo no lint (SEC-DEV-02), com `detect-object-injection` desligada por falso positivo em TS strict.
- **2026-11-18** — Passo 7. `@zooloo/validation` (Zod 4): `IdSchema` (UUIDv7), `LocalDateSchema`, `CentsSchema`, `MoneySchema`, `HexColorSchema`, `IsoDateTimeSchema`, `IdempotencyKeySchema`, `CursorPageQuerySchema`; schemas de categoria (criar, alterar, resposta); `ProblemSchema` e `problemFromZodError` (RFC 9457); `useBrazilianPortugueseErrors`. Decisão de projeto [I]: o tipo da categoria (receita/despesa) não muda depois de criada. `@zooloo/i18n`: catálogo pt-BR tipado com plural (`zero`/`one`/`other`), `formatMoney` exato a partir dos centavos (sinal sempre, modo privado, casas da moeda), `parseMoneyInput` (formato pt-BR, recusa `12.34` e `1,234`), `formatLocalDate` sem efeito de fuso. `@zooloo/domain` ganhou `toIsoDate`. Regexes reescritas sem quantificador aninhado e sem `RegExp` dinâmica (alertas do `eslint-plugin-security`). Pacotes internos lidos de `src/` em dev e teste (ADR-0004); configuração do Vitest movida para `tools/vitest-config` porque o Stryker não resolvia caminho relativo no sandbox. `pnpm check` verde; mutação: domain 89,6%, security 98,4%.
- **2026-11-18** — Passo 8. `@zooloo/db-schema` com Drizzle 0.45: PostgreSQL (`users`, `profiles`, `categories`) com RLS por `app.user_id`, `FORCE`, grants mínimos para `zooloo_app`, FKs compostas contra referência cruzada, nome de categoria único por nível sem diferenciar maiúsculas e uma "Outros" por tipo (ADR-0005). SQLite local espelhado, testado com `node:sqlite` pelo driver `sqlite-proxy` (o mesmo caminho do Web Worker). 27 testes: 21 contra PostgreSQL 17 real (Testcontainers) e 6 de paridade/banco local. Teste estrutural validado por sabotagem: sem `FORCE` em `categories`, falha. CI ganhou verificação de migração pendente. Scripts de instalação de dependências negados explicitamente em `pnpm-workspace.yaml` (SEC-DEV-03). Bug do drizzle-kit em índice de expressão no SQLite contornado com migração custom (TD-005). Docker CLI precisa estar no PATH para o Testcontainers achar o `docker-credential-desktop`.
- **2026-11-18** — Passo 9. `apps/api` com NestJS 12 (ESM, Standard Schema nativo) sobre Fastify 5: `GET /api/v1/health` e `/health/ready` (503 problem+json sem detalhe interno quando o banco cai), filtro global problem+json (RFC 9457, `instance` sem query string, 5xx genérico e logado mascarado), validação de corpo com schemas Zod via `StandardSchemaValidationPipe` (422), helmet com CSP fechada, limite de corpo 1 MiB (413), env validado com Zod sem vazar valores, `DatabaseService.withUser` abrindo a RLS por transação, OpenAPI 3 gerado dos schemas Zod e versionado em `apps/api/openapi.json` (CI verifica divergência). Testes: 39, cobertura 100%, integração contra PostgreSQL 17 (Testcontainers). Achados: ligar a Swagger UI derrubava o processo (`@fastify/static` ausente) e a CSP bloqueava a UI; corrigidos, UI nunca em produção. API compilada executada de verdade contra PostgreSQL em Docker: ready 200, 404 em problem+json, logs JSON mascarados. Testes do Vitest usam o transformador Oxc com `emitDecoratorMetadata` (sem SWC). `@scarf/scarf` (telemetria de instalação do swagger-ui) negado no `allowBuilds`.
- **2026-11-18** — Passo 10. `pnpm dev:worktree` (`tools/dev-worktree` + `infra/dev/compose.yaml`): projeto Docker `zooloo-<worktree>`, portas derivadas do nome (faixa 20000–29999, slot de 10 portas por FNV-1a), PostgreSQL 17 com papéis `zooloo_owner`/`zooloo_app` iguais aos de produção, Redis 7, migrações como dono, seed sintético (2 usuários `.test`, perfis e categorias) gravado pelo papel da aplicação sob RLS, `.env.worktree` (ignorado pelo git) e API em watch (`tsc --watch` + `node --watch`). Comandos `up`, `api`, `down` (apaga volumes), `status`. No Windows acha o Docker Desktop fora do PATH. Executado de verdade: `up` duas vezes (idempotente), API respondeu `ready` 200 e Swagger UI 200 na porta da worktree. `migratePostgres` extraído para `@zooloo/db-schema/migrate`. Senhas locais isentas no `.gitleaks.toml` só para `infra/dev` e `tools/dev-worktree`. Pendências: observabilidade local (TD-011), lista oficial de categorias (TD-012).
- **2026-11-18** — Passo 11. `apps/web-app` com Vite 8, React 19 e React Router 8 em `/app/`. App shell do doc 13 §5.1 (topbar Midnight com marca, busca, indicador de sync, modo privado, tema e "Nova despesa"; menu lateral claro com item ativo em Mint, que vira trilho de ícones abaixo de 1024 px; link "pular para o conteúdo"). Componentes: Button (primário Teal-700, secundário, ghost, perigo, ocupado, só ícone), TextField (rótulo, dica e erro ligados por `aria-describedby`), Card (destaque em Mint; no escuro, Midnight tingido de Teal), Amount (número em Plus Jakarta tabular, símbolo menor, sinal tipográfico, cor + texto acessível "entrada/saída", modo privado), SyncStatus (online/offline anunciado), ZoolooLogo provisório. Variáveis CSS geradas de `@zooloo/ui-tokens` no build (sem estilo inline, compatível com CSP). Fontes Inter e Plus Jakarta Sans servidas pelo app, só subsets latinos. Ícones provisórios (192, 512, maskable, apple-touch, favicon SVG) gerados por script com codificador PNG próprio (sem dependência nativa). Manifest do doc 07 §4A (sem atalhos e file handlers, que dependem de telas futuras). Atalhos `/` e `N`. `@zooloo/i18n` ganhou `moneyParts` e textos do shell; menu alinhado ao doc 06 ("Transações", "Gráficos"). `dev:worktree` passou a subir o web-app com proxy `/api`. Testes: 36 (componentes, shell, atalhos, tema, privacidade, offline, ícones, tokens), axe sem violações, cobertura 99% linhas e 94% branches. Revisão visual por capturas do Chrome headless nos dois temas e em tela estreita; corrigidos: topbar sem separação no tema escuro, card de destaque igual aos demais no escuro, coluna do menu curta. ESLint com `react-hooks` e `jsx-a11y` (strict).
