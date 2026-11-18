# 09 — Arquitetura e stack tecnológica

Status: **decisão de arquitetura** [I]. Este documento substitui as sugestões de stack anteriores (doc 07 §1) e registra o porquê de cada escolha.

## 1. Stack definida

| Camada | Tecnologia | Observação |
|---|---|---|
| Linguagem | **TypeScript** (strict) em todas as camadas | Tipos e regras compartilhados entre backend, mobile e Web/PWA |
| Backend / API | **Node.js** LTS + **NestJS** (ou Fastify) | REST + WebSocket/SSE; validação com Zod |
| Banco central | **PostgreSQL** 16+ | Row-Level Security, particionamento, PITR |
| Filas e cache | **Redis** + **BullMQ** | Open Finance, recorrências, relatórios mensais, e-mails, rate limit, exclusão por inatividade |
| Armazenamento de arquivos | Object storage compatível com S3 | Anexos e snapshots de pontos de restauração, criptografados |
| App móvel | **React Native + Expo** (SDK atual, *development build*) + Expo Router | Android e iOS; app **Zooloo Kids** como segundo app no mesmo monorepo |
| Banco local mobile | **expo-sqlite** com **SQLCipher** (`useSQLCipher`) + **Drizzle ORM** | SQL real, criptografado em repouso |
| App Web/PWA (`/app`) | **React + Vite** (aplicação client-side) + **Serwist/Workbox** | PWA instalável, 100% offline |
| Banco local Web | **SQLite WASM oficial (`@sqlite.org/sqlite-wasm`) com VFS `opfs-sahpool`** em Web Worker + **Drizzle** (driver proxy) | Dispensa COOP/COEP e SharedArrayBuffer; ver §4 |
| Site público | **Next.js** (SSR/SSG) | Landing, planos, Central de Ajuda, calculadoras, SEO, páginas de login, consentimento OAuth/MCP e checkout |
| Sincronização | Motor próprio **`@zooloo/sync-core`** (outbox + pull delta + merge por campo com HLC) | O mesmo código no mobile e no PWA; protocolo do doc 07 §4 |
| Regras de domínio | **`@zooloo/domain`** | Saldos, faturas, orçamentos, parcelas, conciliação; usado no servidor, mobile e PWA |
| MCP / OAuth | `@modelcontextprotocol/sdk` (TypeScript) + `oidc-provider` | OAuth 2.1, DCR, PKCE S256, revogação, metadados RFC 8414/9728 |
| IA (Zoe) | SDK oficial do provedor de LLM (ex.: Anthropic) com tool calling | Ferramentas iguais às do MCP |
| Assinaturas | **RevenueCat** (ou integração direta) + gateway web (Stripe BR / Pagar.me) | Entitlement único para Google Play, App Store e Web |
| Push | expo-notifications (FCM/APNs) + Web Push (VAPID) | — |
| Monorepo | **pnpm + Turborepo** | Ver §3 |
| Observabilidade | OpenTelemetry + Sentry | Com regras de mascaramento do doc 10 |
| Testes | **Vitest** (unidade/integração) + **fast-check** (propriedade) + **Stryker** (mutação) + **Testcontainers** (PostgreSQL real) + **Playwright** (Web/PWA) + **Maestro/Detox** (mobile) + **k6** (carga) | Metas por camada e cobertura global ≥ 90% (doc 04 §7A) |

## 2. Decisões e justificativas

### 2.1 Por que **não** WatermelonDB
- No navegador, o adaptador do WatermelonDB é o **LokiJS**: o banco inteiro fica em memória e é persistido no IndexedDB. Com anos de lançamentos, isso consome memória e torna o PWA frágil.
- Várias abas podem sobrescrever o IndexedDB umas das outras (a própria documentação expõe o evento `onDidOverwrite` para esse caso).
- O protocolo de sync do WatermelonDB (`pullChanges`/`pushChanges` com `lastPulledAt`, resolução por registro) difere do merge por campo com HLC exigido pelo doc 07.
- **Decisão**: SQLite real nos dois mundos (expo-sqlite no mobile, SQLite WASM no PWA), um esquema Drizzle compartilhado e um motor de sync próprio.

### 2.2 Por que Next.js **só** no site
- O Next.js brilha em SSR/SEO, mas o app precisa rodar 100% no cliente e offline.
- O `/app` é uma aplicação Vite separada, com Service Worker próprio. Isso evita conflito de cache entre SSR e o PWA e simplifica o escopo do Service Worker (`/app/`).
- Telas densas do desktop (tabelas, edição inline, atalhos de teclado) ficam melhores em React DOM do que em componentes React Native renderizados no navegador. Por isso o **web não reutiliza as telas do mobile**; reutiliza `domain`, `sync-core`, `db-schema`, `api-client`, `i18n` e tokens de design.

### 2.3 PostgreSQL + Redis
- O PostgreSQL concentra integridade (FKs, constraints), RLS para isolamento por usuário e consultas analíticas (relatórios).
- O Redis atende filas (BullMQ), contadores de limite (MCP, IA, login) e locks distribuídos.

### 2.4 Dinheiro em JavaScript
- Valores em **centavos inteiros** (`bigint` no PostgreSQL).
- O driver `pg` retorna `bigint` como string; configurar o parser para `number` (seguro até 2^53 centavos ≈ R$ 90 trilhões) ou usar `bigint` nativo do JS no domínio.
- **Proibido** usar `float` para valores. Arredondamentos ficam centralizados em `@zooloo/domain` (RNF-FIN-04).

## 3. Estrutura do monorepo

```
zooloo/
├─ apps/
│  ├─ mobile/          # Expo – Zooloo Finanças (Android/iOS)
│  ├─ kids/            # Expo – Zooloo Kids
│  ├─ web-app/         # Vite + React – PWA (/app)
│  ├─ site/            # Next.js – site público, ajuda, calculadoras, OAuth/consentimento, checkout
│  ├─ api/             # NestJS – REST, sync, WebSocket, webhooks
│  ├─ mcp/             # Servidor MCP (Streamable HTTP)
│  └─ workers/         # BullMQ – Open Finance, recorrências, IA, e-mails, jobs LGPD
├─ packages/
│  ├─ domain/          # regras de negócio puras (sem I/O); ≥ 95% de cobertura + mutação (RNF-QA-02)
│  ├─ sync-core/       # outbox, pull/push, HLC, merge, migrações locais
│  ├─ db-schema/       # Drizzle: esquema local (SQLite) + esquema servidor (Postgres)
│  ├─ api-client/      # cliente tipado (gerado de OpenAPI/Zod)
│  ├─ validation/      # schemas Zod compartilhados
│  ├─ security/        # utilitários de criptografia, mascaramento de logs, sanitização
│  ├─ i18n/            # textos pt-BR
│  └─ ui-tokens/       # cores, tipografia, espaçamentos da marca Zooloo (doc 13 §6)
└─ infra/              # IaC (Terraform), políticas, pipelines
```

Regras do monorepo:
- `packages/domain` **não** importa nada de I/O (rede, banco, plataforma).
- Apps só se comunicam pelos pacotes e pela API; nunca importam código de outro app.

## 4. Banco local por plataforma

| Aspecto | Mobile (Expo) | PWA (navegador/desktop) |
|---|---|---|
| Motor | expo-sqlite (SQLite nativo) | `@sqlite.org/sqlite-wasm` em **Web Worker** dedicado |
| Persistência | Arquivo no sandbox do app | **OPFS** via VFS `opfs-sahpool` |
| Cabeçalhos especiais | — | **Não exige** COOP/COEP nem SharedArrayBuffer. Assim, widgets de terceiros (Pluggy, checkout) funcionam sem conflito |
| Concorrência | Uma conexão do app | O `opfs-sahpool` não aceita duas abas abrindo o mesmo banco. Uma aba é **líder** (Web Locks API) e as outras falam com ela via BroadcastChannel/SharedWorker |
| ORM | Drizzle (driver expo-sqlite) | Drizzle (driver `sqlite-proxy` → Worker) |
| Criptografia em repouso | SQLCipher (`PRAGMA key`), com verificação obrigatória de `PRAGMA cipher_version` antes de abrir | Ver doc 10 §6.2 (build com cifra ou criptografia por campo) |
| Fallback | — | Navegador sem OPFS: modo online com cache de leitura (sem CRUD offline), com aviso |
| Busca textual | FTS5 (`enableFTS`) | Busca por `LIKE` normalizado; FTS só com build WASM próprio |

## 5. Código nativo necessário (≈ 5–10% do app)

Exige *development build*: **Expo Go não serve**.

| Recurso | Plataforma | Implementação | Risco |
|---|---|---|---|
| Leitura de notificações bancárias | Android | Expo Module em Kotlin (`NotificationListenerService`) + fila nativa | Restrições do Android 15+ (alertas sensíveis) |
| Leitura de SMS | Android | Expo Module em Kotlin | **Alto**: a política do Google Play restringe `READ_SMS`/`RECEIVE_SMS`; exige formulário de declaração (há exceção para gestão financeira via SMS, sem garantia de aprovação). Plano B: só notificações |
| Siri, Atalhos, Carteira | iOS | App Intents em Swift (target extra via `expo-apple-targets`) | A ação "Importar notificação" depende do iOS 27 |
| Widgets | Android/iOS | `react-native-android-widget` / WidgetKit (Swift) | — |
| Google Agenda | Android | API REST do Google Calendar (OAuth) | Revisão de escopos do Google |
| Leitura de cupom fiscal | Android | expo-camera (QR) + consulta NFC-e por estado | Layouts diferentes por SEFAZ |
| Sync em segundo plano | Android/iOS | `expo-background-task` | No iOS, o sistema decide quando executa; sync garantido ao abrir o app |
| Bloqueio de captura de tela | Android/iOS | `expo-screen-capture` | — |

## 6. Dependências externas (não técnicas)

- **Agregador Open Finance** (Pluggy ou similar): contrato, ambiente sandbox e homologação.
- **Lojas**: política de SMS e notificações (Google), revisão de App Intents (Apple), compras in-app obrigatórias para conteúdo digital nas lojas.
- **Provedor de LLM** com contrato de retenção zero e sem uso dos dados para treino (doc 10).

## 7. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| OPFS/SQLite WASM variar entre navegadores (Safari) | PWA offline instável | Testes E2E em Chrome, Edge e Safari desde o início; fallback online com aviso |
| Conflitos de sync complexos (séries recorrentes, faturas) | Dados divergentes | Testes de propriedade em `sync-core`; o servidor recalcula os derivados; nada derivado é sincronizado como verdade |
| Recusa da permissão de SMS | Perda de recurso | Priorizar notificações + Open Finance; SMS como opcional |
| Desempenho do RN com listas grandes | UX ruim | FlashList; paginação no SQLite; consultas agregadas no banco local |
| Custo de IA | Margem | Créditos por plano (doc 08); cache de respostas analíticas; modelos menores para categorização |

## 8. Provas de conceito obrigatórias antes do desenvolvimento

As PoCs 1, 2 (parte PWA) e a estratégia Web da 3 acontecem na Fase 0; as partes mobile da 2 e da 3 no início da Fase 2; a 4 no início da Fase 3; a 5 na Fase 5 (doc 11).

1. **PoC PWA offline**: Vite + sqlite-wasm `opfs-sahpool` + Drizzle proxy + Web Locks (líder entre abas) + instalação no Windows e no macOS (Chrome, Edge, Safari).
2. **PoC sync**: `sync-core` rodando no Expo e no PWA contra a API, com conflito simultâneo de edição/exclusão e 20 mil lançamentos.
3. **PoC criptografia local**: SQLCipher no Expo (verificação de `cipher_version`) e estratégia escolhida para o Web (doc 10 §6.2).
4. **PoC Pluggy**: widget no Web e no RN, webhooks e parcelas.
5. **PoC notificações Android**: módulo Kotlin + parser de 3 bancos.
