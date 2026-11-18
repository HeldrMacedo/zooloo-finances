# Dívida técnica

| ID | Descrição | Origem | Prioridade |
|---|---|---|---|
| TD-001 | TypeScript fixado em 6.0.x por compatibilidade com `typescript-eslint`; migrar para 7.x quando suportado | ADR-0001 | baixa |
| TD-002 | Lint de "dinheiro como `number`" ainda heurístico (bloqueia `toFixed`/`parseFloat`); falta regra com tipos que exija `Money` em campos monetários | doc 12 §5.2 | média |
| TD-003 | Mutantes sobreviventes em mensagens de erro do domínio (score 89%); avaliar ignorar `StringLiteral` de mensagens ou testar mensagens | Stryker | baixa |
