# Arquitetura

Fonte normativa: `docs/product-specs/09-arquitetura-e-stack.md` (stack) e `docs/product-specs/12-modo-de-desenvolvimento-harness-engineering.md` §5 (camadas).

## Pacotes e apps

| Caminho | Status | Papel |
|---|---|---|
| `packages/domain` | ativo | Regras de negócio puras, sem I/O: `Money`, `LocalDate`, parcelas, ciclo de fatura, orçamento |
| `packages/ui-tokens` | ativo | Tokens da marca (doc 13 §6), temas claro/escuro, teste de contraste |
| `packages/sync-core` | planejado | Outbox, pull/push, HLC, merge por campo |
| `packages/db-schema` | planejado | Drizzle: esquema SQLite local + PostgreSQL |
| `packages/validation` | planejado | Schemas Zod compartilhados |
| `packages/security` | planejado | Logger mascarado, criptografia, sanitização |
| `packages/api-client` | planejado | Cliente tipado gerado do OpenAPI |
| `packages/i18n` | planejado | Textos pt-BR |
| `apps/api` | planejado | NestJS + Fastify (ADR-0002): REST `/api/v1`, sync, SSE/WebSocket |
| `apps/workers` | planejado | BullMQ: recorrências, e-mails, jobs LGPD |
| `apps/web-app` | planejado | Vite + React PWA em `/app` |
| `apps/site` | planejado | Next.js: landing, termos, privacidade |
| `apps/mobile`, `apps/kids`, `apps/mcp` | reservado | Fases 2, 4 e 5 |

## Regras de dependência (verificadas no CI)

- `packages/domain` não importa nada fora de si (ESLint `no-restricted-imports` + dependency-cruiser `domain-sem-io`).
- Apps não importam outros apps; pacotes não importam apps; sem ciclos (`.dependency-cruiser.cjs`).
- Dentro de cada domínio de negócio: `Types → Config → Repo → Service → Runtime → UI`, com `Providers` como única porta para o transversal (doc 12 §5.1). As regras por camada entram junto com o primeiro app.

## Núcleo de domínio

| Módulo | Regras |
|---|---|
| `money.ts` | RNF-FIN-01: centavos inteiros seguros + ISO 4217; operações recusam moedas diferentes |
| `local-date.ts` | RNF-FIN-02, RN-LAN-14: datas sem fuso; soma de meses leva dia 29–31 ao fim do mês curto |
| `rounding.ts` | RNF-FIN-04: divisão half-even |
| `installments.ts` | RN-LAN-11: parcelas truncadas, resíduo na 1ª |
| `card-invoice.ts` | RN-CRT-02, RN-CRT-03: fatura pela regra de fechamento |
| `budget.ts` | RN-ORC-06, RN-ORC-08: indicadores do orçamento |
