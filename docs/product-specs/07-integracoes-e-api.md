# 07 — Integrações, algoritmos e API

## 1. Arquitetura de referência [I]

```
┌───────────┐  ┌───────────┐  ┌──────────┐
│ Android   │  │ iOS       │  │ Web/PWA  │      núcleo de domínio compartilhado
│ (offline) │  │ (offline) │  │ (offline)│  ←── (regras de saldo/fatura/orçamento)
└────┬──────┘  └────┬──────┘  └────┬─────┘
     │ REST + sync delta + WS     │
┌────▼────────────────────────────▼─────────────────────────┐
│ API Gateway (auth, rate limit)                            │
├──────────┬──────────┬──────────┬───────────┬─────────────┤
│ Core API │ Sync svc │ Billing  │ OF worker │ AI svc (Zoe)│
│          │          │ (Web+    │ (Pluggy)  │ + MCP server│
│          │          │ lojas)   │           │ + OAuth AS  │
└────┬─────┴────┬─────┴────┬─────┴─────┬─────┴──────┬──────┘
   PostgreSQL (RLS)   Redis (rate/cache)   Object storage (anexos, snapshots)
   Fila (jobs: recorrências, OF sync, relatórios mensais, exclusão por inatividade)
```

Stack definida: ver **[doc 09 — Arquitetura e stack](09-arquitetura-e-stack.md)**. Resumo:
- TypeScript em tudo;
- Node.js (NestJS) + PostgreSQL + Redis/BullMQ;
- React Native + Expo com expo-sqlite + SQLCipher + Drizzle;
- PWA em React + Vite com SQLite WASM (`opfs-sahpool`) + Drizzle + Serwist;
- Next.js só para o site público;
- `@zooloo/domain` e `@zooloo/sync-core` compartilhados.

Controles de segurança: [doc 10](10-seguranca-e-protecao-de-dados.md).

## 2. Algoritmos de domínio

### 2.1 Fatura de uma compra (RN-CRT-02/03)

```
entrada: launch_date L, card {due_day, closing_rule, closing_value}
para mês candidato M = mês(L) .. mês(L)+2:
    due   = data(M, min(due_day, últimoDia(M)))
    close = closing_rule == days_before_due
              ? due - closing_value dias
              : data(M_close, min(closing_value, últimoDia)) onde M_close é
                o mês cujo dia fixo é o último fechamento antes de 'due'
    se L <= close: retornar fatura(due)
```
Retorna a primeira fatura cujo fechamento é ≥ data da compra. Parcelas k = 2..n vão para as faturas seguintes (due + (k−1) meses).

### 2.2 Saldos (RN-CTA-03)
```
data_caixa(tx) = tx.status == settled ? tx.settled_date : tx.due_date
efeito(tx, conta):
  income  → +amount (amount negativo = compensação → saída)
  expense → −amount (amount negativo = reembolso → entrada)
  transfer → −amount na origem, +amount no destino
  despesa de cartão → não afeta conta; pagamento de fatura afeta
saldo_atual(conta, hoje) = initial + Σ efeito(tx settled, data_caixa ≤ hoje)
saldo_previsto(conta, D) = saldo_atual + Σ efeito(tx pending, due_date ≤ D)
saldo_geral = Σ contas com ignore_in_totals=false e is_group=false
```

### 2.3 Orçamento (RN-ORC-*)
```
ref(tx) = {due: due_date, settled: data_caixa(tx), launch: launch_date}[budget.reference_date]
conjunto = tx do tipo do orçamento, ref(tx) ∈ período,
           categoria ∈ filtros (ou splits), tags conforme tag_mode, cartão ∈ filtros,
           excluir loan e (ignored salvo include_ignored)
efetivado = Σ conjunto settled ; pendente = Σ conjunto pending
considerado = efetivado + (use_forecast ? pendente : 0)
meta = fixed | pct × receita_total_mês | pct × meta(orc_receita) | Σ metas membros
saldo = meta − considerado
reserva_previsto = Σ max(0, saldo) dos marcados se Σ saldo dos marcados > 0, senão 0  (RN-ORC-14)
```

### 2.4 Parcelas Open Finance (RN-OF-08)
Ao receber uma transação com `installmentNumber = k` e `totalInstallments = n`:
1. Buscar uma série existente (mesmo cartão, comerciante normalizado, n, data da compra ± 2 dias).
2. Se não existir: criar `recurrence(installments)` com a parcela k real e as previstas k+1..n com o valor de k, marcadas `source=open_finance_forecast`.
3. Se existir: substituir a prevista k pela real (atualiza o valor), sem duplicar.
4. Em cada sincronização de fatura: se a série some da fatura em que deveria estar, remover as previstas (nunca as reais).

### 2.5 Conciliação (RN-IMP-15)
```
score = 0.45·[valor igual] (ou 0.30 se dentro de ±15% e alvo tem "valor variável")
      + 0.20·max(0, 1 − |Δdias|/4)
      + 0.15·[mesma conta/cartão]
      + 0.15·sim_tokens(descrição+notas)
      + 0.05·[mesma série recorrente]
sugere se score ≥ 0.70; auto-mescla somente se automação habilitada e score ≥ 0.90 e
não houver segundo candidato com score ≥ score1 − 0.10
```

### 2.6 Recorrências fixas
Materialização preguiçosa: um job diário garante ocorrências até `hoje + 13 meses`; leituras além do horizonte geram virtuais no cliente.

## 3. API Core (REST) [I]

Base `/api/v1`. Autenticação Bearer. Escopo de perfil por header `X-Profile-Id`.

| Recurso | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/password/forgot`, `/auth/password/reset`, `/auth/email/verify` |
| Usuário | `GET/PATCH /me`, `DELETE /me`, `POST /me/export`, `GET /me/devices`, `DELETE /me/devices/{id}` |
| Perfis | `GET/POST /profiles`, `PATCH/DELETE /profiles/{id}`, `POST /profiles/{id}/archive`, `POST /profiles/{id}/pin`, `POST /profiles/{id}/unlock` |
| Contas | `GET/POST /accounts`, `PATCH/DELETE /accounts/{id}`, `POST /accounts/{id}/adjust-balance`, `GET /accounts/{id}/statement?from&to` |
| Cartões | `GET/POST /cards`, `PATCH/DELETE /cards/{id}`, `GET /cards/{id}/invoices?due=YYYY-MM`, `POST /invoices/{id}/payments`, `POST /invoices/{id}/reopen` |
| Categorias/Tags | `GET/POST/PATCH/DELETE /categories`, `/tags`, `POST /categories/{id}/move-transactions` |
| Lançamentos | `GET /transactions?filters`, `POST /transactions`, `PATCH /transactions/{id}?scope=one|future|all`, `DELETE …?scope=`, `POST /transactions/{id}/settle`, `POST /transactions/{id}/convert`, `POST /transactions/batch`, `POST /transactions/merge` |
| Anexos | `POST /attachments/presign`, `DELETE /attachments/{id}` |
| Orçamentos | `GET/POST /budgets`, `PATCH/DELETE /budgets/{id}`, `GET /budgets/{id}/progress?month`, `POST /budgets/{id}/transfer`, `POST /budgets/{id}/copy` |
| Objetivos | `GET/POST /goals`, `PATCH/DELETE /goals/{id}`, `POST /goals/{id}/deposits`, `GET /goals/{id}/simulate?monthly=` |
| Empréstimos | `GET/POST /loans`, `PATCH/DELETE /loans/{id}?keep=all|settled|none`, `POST /loans/{id}/repayments`, `/abatements`, `/schedule`, `/link`, `/compare` |
| Relatórios | `POST /reports/query`, `POST /reports/compare`, `GET/POST /saved-filters`, `POST /reports/export` |
| Dashboard | `GET /dashboard`, `PUT /dashboard/layout`, `GET /health-score` |
| Import/Export | `GET/POST /import-templates`, `POST /imports` (multipart) → preview, `POST /imports/{id}/commit`, `GET /reconciliation-suggestions`, `POST …/{id}/accept|reject` |
| Open Finance | `GET /of/institutions`, `POST /of/connect-token`, `POST /of/connections`, `GET/DELETE /of/connections/{id}`, `POST /of/connections/{id}/refresh|reset`, `PATCH /of/items/{id}` (vincular/desvincular), `POST /webhooks/pluggy` |
| Zooloo Plus | `GET /sync/pull?since=version`, `POST /sync/push` (lote de mutações com HLC), WS `/sync/stream` |
| Restauração | `GET/POST /restore-points`, `POST /restore-points/{id}/restore`, `DELETE …` |
| Assinatura | `GET /billing/plans`, `POST /billing/checkout`, `GET /billing/subscription`, `POST /billing/cancel`, `POST /billing/refund`, webhooks `/webhooks/{gateway|google|apple}` |
| IA | `POST /ai/chat` (SSE), `GET /ai/credits`, `GET /ai/reports/{month}`, `POST /ai/pending-actions/{id}/confirm|reject` |
| MCP | `GET /mcp/connections`, `DELETE /mcp/connections/{id}` |
| Zooloo Kids | `POST /kids/pair`, `GET /kids/{id}/overview`, `GET/POST/PATCH /kids/{id}/agreements` |

Convenções: paginação por cursor; `Idempotency-Key` obrigatório em POST de criação (protege contra repetição por agente/rede — RN-MCP); erros em RFC 9457 (problem+json).

## 4. Sincronização [I]

- **Push**: o cliente envia `[{entity, id, op, fields, hlc}]`. O servidor aplica merge por campo (maior HLC vence), grava `change_log` e retorna a nova `server_version`.
- **Pull**: `since=v` → mudanças com `server_version > v` (páginas de 1.000).
- **Notificação**: WS/SSE envia `{"type":"changed","version":v}`; o cliente faz pull.
- **Essencial (backup)**: o mesmo protocolo, mas o servidor rejeita um 2º dispositivo ativo (RN-DEV-01).
- **Restauração**: snapshot = dump do perfil (JSON comprimido) em object storage. Restaurar é uma transação que substitui as entidades do perfil e incrementa as versões, para propagar a todos os dispositivos.

## 4A. PWA — detalhes técnicos [I]

**Manifest** (`/app/manifest.webmanifest`):
```json
{
  "name": "Zooloo Finanças",
  "short_name": "Zooloo",
  "id": "/app/",
  "start_url": "/app/?source=pwa",
  "scope": "/app/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone"],
  "background_color": "#F8FAF8",
  "theme_color": "#142B3B",
  "icons": [
    {"src": "/icons/zooloo-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/icons/zooloo-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "/icons/zooloo-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ],
  "shortcuts": [
    {"name": "Nova despesa", "url": "/app/novo?tipo=despesa"},
    {"name": "Nova receita", "url": "/app/novo?tipo=receita"},
    {"name": "Transferência", "url": "/app/novo?tipo=transferencia"},
    {"name": "Zoe", "url": "/app/zoe"}
  ],
  "file_handlers": [
    {"action": "/app/importar", "accept": {
      "application/x-ofx": [".ofx"], "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]}}
  ]
}
```

**Service Worker** (Serwist/Workbox):
- precache do app shell e dos chunks versionados (hash no nome);
- navegação SPA servida do cache quando offline;
- runtime cache só para assets estáticos e logos de bancos;
- sem cache de respostas de `/api/*` (RNF-PWA-04);
- Background Sync (tag `zooloo-push`) e Push.

**Camada de dados no cliente**:
```
UI (React) ─► repositórios (Drizzle) ─► Web Worker: SQLite WASM (opfs-sahpool, cifrado)
                                 │
                       outbox (mutações com HLC) ──► POST /sync/push
                                 ▲
                         GET /sync/pull?since=v ◄── WS/SSE "changed"
```
- O motor de sync (outbox, pull, merge HLC) é o **mesmo pacote TypeScript** usado no app React Native, publicado como `@zooloo/sync-core`. O núcleo de domínio (saldos, faturas, orçamentos) é `@zooloo/domain`.
- O `install_id` é gerado na primeira execução e guardado no banco local (RN-DEV-06), enviado no header `X-Device-Id`.
- Web Locks + BroadcastChannel coordenam várias abas: uma aba líder mantém o banco e as outras usam proxy (RNF-PWA-06).
- O VFS `opfs-sahpool` **não exige** cabeçalhos COOP/COEP. Assim, o widget Pluggy e o checkout funcionam normalmente (doc 09 §4).

**Autenticação no PWA**: refresh token em cookie `HttpOnly` (`/api/auth/refresh`). O access token fica em memória. Para o uso offline, um "selo de sessão" assinado pelo servidor fica no banco local, com `offline_until` (30 dias — RN-PWA-09) e o entitlement em cache (RN-PWA-10).

**Push**: Web Push com VAPID (Chromium, e Safari no macOS 13+), mesmo catálogo de eventos do §9.

## 5. Open Finance — Pluggy [O agregador; I detalhes]

1. `POST /of/connect-token` → backend obtém o connect token da Pluggy (`POST https://api.pluggy.ai/connect_token`).
2. O cliente abre o Pluggy Connect Widget (Web SDK / React Native / WebView) → recebe `itemId`.
3. `POST /of/connections {itemId, categorization_mode, links[]}` → valida o limite de instituições do plano.
4. Webhooks Pluggy (`item/updated`, `transactions/created`, `item/error`, `item/waiting_user_input`) → fila → worker busca `/accounts`, `/transactions?from=` e aplica: dedupe por id externo → categorização → parcelas (§2.4) → transferências → automações → conciliação.
5. Agendamento: até 4 atualizações/dia por item (ex.: 06h, 11h, 16h, 21h BRT); pausar se `last_active_at` > 30 dias (RN-OF-16).

## 6. OAuth 2.1 + MCP [O metadados reais]

Metadados observados na referência:

```json
// GET https://mcp.<dominio>/.well-known/oauth-protected-resource
{"resource":"https://mcp.<dominio>/","authorization_servers":["https://<dominio>/oauth"],
 "scopes_supported":["finances:read","finances:write"],"bearer_methods_supported":["header"]}

// GET https://<dominio>/.well-known/oauth-authorization-server/oauth
{"issuer":"https://<dominio>/oauth",
 "authorization_endpoint":".../oauth/authorize","token_endpoint":".../oauth/token",
 "revocation_endpoint":".../oauth/revoke","registration_endpoint":".../oauth/register",
 "scopes_supported":["finances:read","finances:write"],
 "response_types_supported":["code"],"grant_types_supported":["authorization_code","refresh_token"],
 "code_challenge_methods_supported":["S256"],"token_endpoint_auth_methods_supported":["none"],
 "authorization_response_iss_parameter_supported":true}
```

O MCP sem token responde `401` com `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource", scope="finances:read finances:write"` e um corpo JSON-RPC `{"code":-32000,"data":{"code":"AUTH_REQUIRED"}}` [O].

### Ferramentas MCP propostas [I, baseadas nas capacidades descritas — O]

| Ferramenta | Escopo | Confirmação |
|---|---|---|
| `list_profiles` | read | — |
| `get_summary(profile, period)` | read | — |
| `list_accounts(profile)` / `get_balances` | read | — |
| `search_transactions(profile, filters)` | read | — |
| `list_pending(profile, overdue?)` | read | — |
| `list_invoices(profile, card?, month?)` | read | — |
| `list_categories(profile)` / `spending_by_category` | read | — |
| `list_budgets(profile, month)` | read | — |
| `list_goals(profile)` | read | — |
| `compare_periods(profile, a, b)` | read | — |
| `create_transaction(...)` (incl. parcelada/fixa) | write | direta se "criar sem confirmação" + pedido explícito; senão rascunho |
| `create_goal(...)` / `add_goal_deposit(...)` | write | idem |
| `update_transaction(...)` | write | **sempre** rascunho |
| `settle_transaction(...)` | write | **sempre** rascunho |
| `pay_invoice(...)` | write | **sempre** rascunho |
| `manage_budget(...)` | write + autorização específica | **sempre** rascunho |
| `get_unlock_link(profile)` | read | — (para perfis com PIN) |

Rascunho = `pending_action` + URL `https://<dominio>/confirmar/{id}` devolvida ao agente.

## 7. IA interna (Zoe) [I]

- Orquestrador LLM com *tool calling* sobre as **mesmas** ferramentas de domínio do MCP (uma só camada de regras).
- Visão/OCR para comprovantes (imagem/PDF) → extrair valor, data, estabelecimento, categoria sugerida → `pending_action`.
- Débito de créditos por chamada (`ai_credit_ledger`), com verificação prévia de saldo.
- Relatório Inteligente: job no dia 1 às 06h BRT → métricas (variação por categoria, fixas × variáveis, cartões, orçamentos estourados, objetivos) → LLM gera texto curto com título → push.
- Categorização Open Finance/CSV: primeiro regras do histórico do usuário (descrição normalizada → categoria mais usada); se não houver, classificador por MCC/estabelecimento; por último, LLM.

## 8. Pagamentos [I]

- **Web**: gateway brasileiro (ex.: Stripe BR, Pagar.me, Asaas) com cartão recorrente e Pix (Pix Automático para renovação).
- **Android**: Google Play Billing (assinaturas + produto avulso "perfil adicional").
- **iOS**: StoreKit 2 + App Store Server Notifications v2.
- **Entitlements** unificados no backend. O cliente nunca decide o plano sozinho.
- Reembolso em 7 dias: no Web, via gateway; nas lojas, orientar para o fluxo da loja (política da Apple/Google).

## 9. Notificações push [I]

FCM (Android), APNs (iOS) e Web Push/VAPID (Web/PWA no desktop). Tipos: vencimento amanhã/hoje, fatura vence em N dias, orçamento atingiu X%, objetivo concluído, conexão OF requer ação, relatório mensal disponível, teste expira em 3 dias/1 dia, ação pendente de agente.

## 10. Parsers de notificação/SMS (Android) [I]

- `NotificationListenerService` filtrando pacotes de bancos e carteiras conhecidos + Mensagens.
- Regras por banco (regex versionadas, baixadas do servidor como configuração remota) → `{tipo, valor, comerciante, final_cartão, conta}`.
- Fallback "genérico": regex de valor monetário `R\$\s?\d{1,3}(\.\d{3})*,\d{2}` + palavras-chave (compra, pix recebido, transferência).
- Antiduplicação local: hash(valor, comerciante normalizado) em janela configurável (RN-NTF-04).
