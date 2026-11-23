# Design — Site público (`apps/site`) e lista de espera do beta

Data: 2026-11-23. Fase 0, passo 15 (`docs/exec-plans/active/fase-0-fundacao.md`).
Fonte: doc 11 §4.3 ("landing simples, página do beta com lista de espera, termos de uso e política de privacidade"), RF-SIT-01 (parcial) e RF-SIT-04 (doc 03), doc 09 §2.2, doc 10, doc 13.

## Objetivo

Publicar a face pública do Zooloo para o beta: apresentar o produto, captar interessados numa lista de espera com consentimento separado para marketing e expor termos de uso e política de privacidade coerentes com o que o sistema faz.

## Critérios de sucesso

- Visitante entra na lista de espera em `/beta`, com ou sem JavaScript, e recebe sempre a mesma confirmação neutra.
- Reenvio do mesmo e-mail não duplica nem revela que o e-mail já estava na lista.
- Aplicação (`zooloo_app`) grava na lista, mas não consegue lê-la.
- CSP com nonce, sem `unsafe-inline`, sem violações no console.
- Termos e privacidade publicados como rascunho marcado; produção bloqueada por dívida até revisão jurídica.
- `pnpm check` verde; Playwright verde em Chrome e Edge; axe sem violações; capturas nos dois temas.

## Fora do escopo

Páginas de recurso, planos, FAQ, Central de Ajuda, calculadoras, login, consentimento OAuth/MCP, checkout (RF-SIT-01 restante, RF-SIT-02, RF-SIT-03). Double opt-in por e-mail (depende de provedor de e-mail). Exportação da lista de espera. IaC e deploy (passo 16).

## Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | Lista de espera gravada pela `apps/api` no PostgreSQL | Sem operador terceiro com dado pessoal; segue validação, logger e RLS existentes |
| D2 | Sem double opt-in agora | Não há provedor de e-mail; entra com os e-mails transacionais (doc 11 §4.4) |
| D3 | Termos e privacidade redigidos pelo agente a partir dos docs 04 e 10, marcados como preliminares | Coerência com o sistema; revisão jurídica obrigatória antes de produção (dívida bloqueante) |
| D4 | Next.js com `output: "standalone"`, páginas pré-renderizadas, formulário por Server Action | Formulário sem JavaScript, sem CORS, CSP com nonce |
| D5 | `POST /waitlist` dispensa `Idempotency-Key` (desvio do SEC-AP-05) | O e-mail é chave natural: índice único + `ON CONFLICT DO NOTHING` tornam o reenvio idempotente. Aprovado por pessoa em 2026-11-23; registrado no ADR-0009 |
| D6 | `<ZoolooLogo>` e geração de variáveis CSS movidos para o novo `@zooloo/ui-web` | Site é o segundo consumidor web (fecha TD-014) |

## Arquitetura

```
navegador ──HTML/form──▶ apps/site (Next.js, Node)
                           │ Server Action
                           │ Authorization: Bearer SITE_API_KEY
                           │ X-Client-Ip: <IP do visitante>
                           ▼
                         apps/api  POST /api/v1/waitlist
                           │ RateLimiter (Redis)
                           ▼
                         PostgreSQL  waitlist_entries (RLS, só INSERT para zooloo_app)
```

### Pacotes

- **`@zooloo/ui-web`** (novo, `packages/ui-web`): `<ZoolooLogo>` (movido de `apps/web-app/src/ui/brand`) e função que gera o CSS de variáveis a partir de `@zooloo/ui-tokens` (extraída de `apps/web-app/build/tokens-css.ts`). O web-app passa a importar do pacote, sem mudança visual.
- **`@zooloo/validation`**: `WaitlistSignupSchema` (estrito):
  - `email`: trim, minúsculas, formato de e-mail, até 254 caracteres;
  - `privacyAccepted`: `true` literal (obrigatório);
  - `marketingOptIn`: boolean, padrão `false`;
  - `privacyVersion`: string da versão da política aceita (ex.: `2026-11-23`);
  - `website`: honeypot, string opcional.
- **`@zooloo/i18n`**: textos do site (landing, formulário, mensagens, rodapé, títulos).

### Dados (`@zooloo/db-schema`, risco alto)

Tabela `waitlist_entries`:

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid | UUIDv7 gerado na API |
| `email` | text | normalizado; único por `lower(email)` |
| `marketing_opt_in` | boolean | não nulo |
| `privacy_version` | text | versão da política aceita |
| `created_at` | timestamptz | adaptador de relógio |

- Sem IP, user agent ou qualquer outro dado (minimização).
- RLS ativa e forçada. `zooloo_app`: grant e política só de `INSERT`; sem `SELECT`, `UPDATE`, `DELETE`. O teste estrutural de RLS passa a incluir a tabela e aceita política só de inserção para ela.
- Teste com Testcontainers prova que `zooloo_app` não lê a tabela.
- Só PostgreSQL: a tabela não existe no SQLite local (não é dado do usuário no dispositivo).

### API (`apps/api`, módulo `waitlist`)

`POST /api/v1/waitlist`

- **Autenticação do site**: `Authorization: Bearer <SITE_API_KEY>`, comparado com `timingSafeEqual`. Ausente ou errado: `401` problem+json. `SITE_API_KEY` no env validado com Zod (mínimo 32 caracteres).
- **IP do visitante**: lido de `X-Client-Ip` só depois da chave válida; validado como IPv4/IPv6. Sem cabeçalho válido, usa o IP da conexão.
- **Rate limit** (SEC-AP-04): porta `RateLimiter` com adaptador Redis (janela fixa, `INCR` + `EXPIRE`) e adaptador em memória para testes.
  - 5 por hora por IP do visitante;
  - 120 por minuto no total da chave do site.
  - Excedido: `429` problem+json com `Retry-After`.
  - Redis fora: falha fechada (`503`), logada mascarada.
- **Corpo**: `WaitlistSignupSchema`; inválido: `422` (pipe existente).
- **Gravação**: honeypot preenchido não grava. Caso contrário, `INSERT ... ON CONFLICT DO NOTHING`.
- **Resposta**: sempre `202` com o mesmo corpo (`{ "status": "accepted" }`), seja e-mail novo, repetido ou honeypot. Não revela existência (mesma lógica do SEC-ID-07).
- **Logs**: só `@zooloo/security`; e-mail mascarado.
- OpenAPI regenerado e versionado.
- `REDIS_URL` passa a fazer parte do env da API; `pnpm dev:worktree` já sobe Redis.

### Site (`apps/site`)

Next.js (App Router), `output: "standalone"`, em `/`. React 19, CSS Modules, tokens do `@zooloo/ui-web`, fontes Inter e Plus Jakarta Sans servidas localmente (subsets latinos), tema claro/escuro por `prefers-color-scheme`.

Páginas (pré-renderizadas, exceto onde o nonce força renderização dinâmica):

- **`/`**: hero, 3 a 4 blocos de proposta (offline-first, privacidade, web/PWA, família) e chamada para o beta. Texto a partir dos docs 01 e 13, sem prometer o que está fora do MVP.
- **`/beta`**: formulário com e-mail, caixa obrigatória "Li a política de privacidade" (link) e caixa opcional "Quero receber novidades" (desmarcada). Campo honeypot oculto de leitores de tela e da navegação. Confirmação neutra ("Pronto! Avisaremos quando sua vaga abrir.").
- **`/termos`** e **`/privacidade`**: rascunho com versão e data e faixa "Versão preliminar — revisão jurídica pendente". A política cobre: dados coletados (e-mail, opt-in, versão aceita), finalidade, base legal, operadores (provedor de nuvem "a definir", ADR-0003), região Brasil, retenção, direitos do titular e como sair da lista. Contato do encarregado e e-mail marcados como `[A DEFINIR]`.
- **`not-found`** e **`error`** próprios; rodapé com links legais.

Server Action `joinWaitlist`:

- valida com `WaitlistSignupSchema`;
- chama a API com `SITE_API_KEY` e o IP do visitante (primeiro IP de `X-Forwarded-For` atrás do proxy da hospedagem; regra isolada numa função testada);
- sem JavaScript: `<form action>` e resposta renderizada no servidor; com JavaScript: `useActionState` mostra envio e erro;
- `429`: "Muitas tentativas. Tente de novo mais tarde."; `422`: erros por campo; outros erros: mensagem genérica, log mascarado.

Env do site validado com Zod: `API_URL`, `SITE_API_KEY`.

**Segurança HTTP** (middleware): nonce por requisição; CSP `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'nonce-…'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'`; HSTS; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` fechada. Sem analytics nem scripts de terceiros. `console.*` proibido (lint).

## Erros

| Situação | API | Site |
|---|---|---|
| Corpo inválido | 422 | erro por campo |
| Chave ausente/errada | 401 | genérico + log de erro (configuração) |
| Rate limit | 429 + `Retry-After` | "Muitas tentativas" |
| Redis/PostgreSQL fora | 503 | genérico |
| E-mail repetido / honeypot | 202 | confirmação normal |

## Testes

- **validation**: schema (normalização, limites, campos desconhecidos, `privacyAccepted` obrigatório).
- **db-schema**: teste estrutural de RLS com a nova tabela; `zooloo_app` insere e não lê; índice único sem diferenciar maiúsculas.
- **api** (Testcontainers + Redis em memória pela porta): 202 idêntico para novo/repetido/honeypot; 401; 422; 429 por IP e global; `X-Client-Ip` ignorado sem chave; e-mail mascarado nos logs.
- **ui-web**: logo e gerador de CSS (testes movidos do web-app).
- **site** (Vitest): componentes do formulário com axe; Server Action com API simulada; montagem da CSP; extração do IP.
- **E2E** (Playwright, build de produção, Chrome e Edge): envio com e sem JavaScript contra API da worktree; nenhuma violação de CSP no console; links legais.
- Capturas em Chrome headless nos dois temas e em tela estreita.
- `pnpm check` verde; cobertura nos limites atuais.

## Integração e documentação

- `pnpm dev:worktree site`: sobe o site com `SITE_API_KEY` de dev e `API_URL` da worktree; `status` mostra a porta.
- `turbo`, ESLint, dependency-cruiser e Prettier incluem `apps/site` e `packages/ui-web`.
- ADR-0009 (site em Next.js standalone, Server Action, chave do site e IP repassado, dispensa do `Idempotency-Key`).
- `ARCHITECTURE.md` (`apps/site` e `packages/ui-web`), plano da Fase 0 (passo 15 e log), `tech-debt-tracker.md`:
  - nova dívida **bloqueante para produção**: revisão jurídica de termos e privacidade e preenchimento do encarregado/contato;
  - double opt-in quando houver provedor de e-mail;
  - TD-014 fechada.

## Risco e revisão humana

Toca `db-schema`/migração/RLS e cria exceção ao SEC-AP-05: risco alto (core-beliefs §Escalar). O PR exige revisão humana dessas partes.
