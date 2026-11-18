# ADR-0003 — Região de hospedagem: Brasil (São Paulo)

- Status: aceito (região); provedor de nuvem em aberto
- Data: 2026-11-18

## Contexto

RNF-LGPD-07 pede dados processados no Brasil quando possível. Latência para usuários brasileiros também conta para RNF-DSP-02 e RNF-PWA-03.

## Decisão

- Banco, API, workers, filas, object storage, backups e KMS ficam em região **no Brasil (São Paulo)**: `southamerica-east1` (GCP), `sa-east-1` (AWS) ou `brazilsouth` (Azure), conforme o provedor escolhido.
- Backups e réplicas de recuperação também no Brasil. Exceções (CDN de ativos estáticos, provedores de e-mail ou LLM fora do país) precisam constar na política de privacidade como operadores.

## Pendências

- Escolher o provedor de nuvem antes do passo 16 do plano da Fase 0 (IaC).
