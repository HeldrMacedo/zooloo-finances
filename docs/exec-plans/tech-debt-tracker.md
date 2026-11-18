# Dívida técnica

| ID | Descrição | Origem | Prioridade |
|---|---|---|---|
| TD-001 | TypeScript fixado em 6.0.x por compatibilidade com `typescript-eslint`; migrar para 7.x quando suportado | ADR-0001 | baixa |
| TD-002 | Lint de "dinheiro como `number`" ainda heurístico (bloqueia `toFixed`/`parseFloat`); falta regra com tipos que exija `Money` em campos monetários | doc 12 §5.2 | média |
| TD-003 | Mutantes sobreviventes em mensagens de erro do domínio (score 89%); avaliar ignorar `StringLiteral` de mensagens ou testar mensagens | Stryker | baixa |
| TD-005 | drizzle-kit 0.31 gera SQL inválido para índice de expressão com vírgula no SQLite; `categories_name_unique` local está em migração custom. Remover a exceção ao atualizar o drizzle-kit | passo 8 | baixa |
| TD-006 | Login, verificação de e-mail e jobs sem usuário na transação precisam de caminho fora da RLS do titular (`SECURITY DEFINER` ou papel de serviço) | ADR-0005 | alta (antes da autenticação) |
| TD-007 | `docs/generated/db-schema.md` ainda não é gerado pelo CI a partir do Drizzle (doc 12 §3.1) | passo 8 | média |
