# ADR-0002 — Framework da API: NestJS com adaptador Fastify

- Status: aceito
- Data: 2026-11-18

## Contexto

O doc 09 §1 deixou em aberto "NestJS (ou Fastify)" para `apps/api`. O projeto é desenvolvido por agentes (doc 12), exige camadas rígidas por domínio (`Types → Config → Repo → Service → Runtime`, com `Providers` como porta do transversal), OpenAPI gerado para o `api-client`, SSE/WebSocket para sync e metas de latência (RNF-DSP-02: p95 de escrita < 500 ms).

## Decisão

**NestJS com `@nestjs/platform-fastify`.**

- **Estrutura previsível para agentes**: módulos, providers e controllers mapeiam direto nas camadas do doc 12 §5.1 (`Repo`/`Service` = providers, `Runtime` = controllers e handlers). Um padrão único é o que mais reduz deriva arquitetural com agentes.
- **Injeção de dependência** é a "porta única" de `Providers`: autenticação, entitlements/feature flags, telemetria, criptografia e sync entram por DI e são trocáveis em teste.
- **Guards, pipes e interceptors** centralizam RLS por requisição (`SET LOCAL app.user_id`), validação Zod na fronteira e mascaramento de logs, em vez de repetir em cada rota.
- **OpenAPI** gerado a partir dos schemas Zod, alimentando o `@zooloo/api-client` e os testes de contrato (RNF-QA-03).
- **Adaptador Fastify** no lugar do Express: mais vazão e menor latência, suporte nativo a SSE e validação rápida, sem abrir mão da estrutura do NestJS.
- Ecossistema maduro para BullMQ (`@nestjs/bullmq`), WebSocket, OpenTelemetry e testes (`@nestjs/testing` + Testcontainers).

Fastify puro foi descartado: mais rápido de começar, mas as camadas, a DI e as convenções teriam de ser inventadas e mantidas por lint próprio.

## Consequências

- `apps/api` e `apps/workers` usam NestJS; `apps/workers` roda como aplicação Nest sem HTTP.
- Plugins Express-only não podem ser usados; preferir equivalentes Fastify.
- Regras de camadas por domínio no dependency-cruiser passam a seguir a estrutura de módulos Nest.
