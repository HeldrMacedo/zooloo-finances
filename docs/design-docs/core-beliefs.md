# Princípios de ouro

Regras opinativas e mecânicas aplicadas continuamente (doc 12 §8). Quando uma regra puder ser verificada por máquina, ela vira lint ou teste estrutural.

1. **Dinheiro é `Money`.** Centavos inteiros + moeda. Arredondamento só em `@zooloo/domain` (half-even, resíduo explícito).
2. **Data de negócio é `LocalDate`.** `Date` só em adaptadores, como timestamp UTC.
3. **Validar na fronteira.** Todo dado externo passa por schema Zod; nunca sondar formato desconhecido.
4. **Utilitário compartilhado antes de helper local.** Invariantes ficam centralizados num pacote.
5. **Regra de domínio começa pelo teste.** Invariantes viram testes de propriedade (fast-check).
6. **Nada derivado é sincronizado como verdade.** Saldos, faturas e orçamentos são recalculados.
7. **Um conceito por arquivo, até ~400 linhas.** Nomes `XxxSchema`, `XxxRepo`, `XxxService`.
8. **Feedback humano repetido vira sistema**: lint, teste estrutural ou documento.

## Escalar

O agente para e chama uma pessoa quando:

- a spec é ambígua ou contraditória;
- a mudança toca o nível de risco alto (doc 12 §6.2): `packages/domain`, `sync-core`, `security`, `db-schema`/migrações, RLS, autenticação, criptografia, pagamentos, entitlements, CI e gates;
- precisa alterar gate, regra de segurança ou dado de produção;
- falhou 3 vezes no mesmo problema.
