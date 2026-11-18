# Planos de execução

- Mudança pequena: plano efêmero na descrição do PR.
- Trabalho complexo (vários PRs, esquema, sync, segurança): arquivo em `exec-plans/active/` com objetivo, critérios de aceite, passos, log de progresso e decisões. Ao terminar, mover para `exec-plans/completed/`.
- Cada passo concluído atualiza o log com data e o que foi verificado (comando e resultado).
- Decisões de arquitetura viram ADR em `design-docs/` e entram no `design-docs/index.md`.
