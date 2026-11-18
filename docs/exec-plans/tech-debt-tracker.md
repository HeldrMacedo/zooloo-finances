# Dívida técnica

| ID | Descrição | Origem | Prioridade |
|---|---|---|---|
| TD-001 | TypeScript fixado em 6.0.x por compatibilidade com `typescript-eslint`; migrar para 7.x quando suportado | ADR-0001 | baixa |
| TD-002 | Lint de "dinheiro como `number`" ainda heurístico (bloqueia `toFixed`/`parseFloat`); falta regra com tipos que exija `Money` em campos monetários | doc 12 §5.2 | média |
| TD-003 | Mutantes sobreviventes em mensagens de erro do domínio (score 89%); avaliar ignorar `StringLiteral` de mensagens ou testar mensagens | Stryker | baixa |
| TD-005 | drizzle-kit 0.31 gera SQL inválido para índice de expressão com vírgula no SQLite; `categories_name_unique` local está em migração custom. Remover a exceção ao atualizar o drizzle-kit | passo 8 | baixa |
| TD-006 | Login, verificação de e-mail e jobs sem usuário na transação precisam de caminho fora da RLS do titular (`SECURITY DEFINER` ou papel de serviço) | ADR-0005 | alta (antes da autenticação) |
| TD-007 | `docs/generated/db-schema.md` ainda não é gerado pelo CI a partir do Drizzle (doc 12 §3.1) | passo 8 | média |
| TD-008 | Autenticação ausente: nenhuma rota de dados existe ainda; o `userId` de `withUser` virá do guard de sessão (SEC-ID). Teste de IDOR por HTTP entra com o CRUD de categorias (F7) | passo 9 | alta |
| TD-009 | Rate limiting (RNF-SEG-09), `Idempotency-Key` em POST de criação (doc 07 §3) e CORS ainda não configurados na API | passo 9 | alta (antes do primeiro endpoint de escrita) |
| TD-010 | Testcontainers no Windows exige `docker-credential-desktop` no PATH ao rodar `pnpm test` fora do `dev:worktree`; o `dev:worktree` já resolve sozinho (`pathWithDocker`) | passo 8/9 | baixa |
| TD-011 | Observabilidade local por worktree (OTel Collector, Loki, Prometheus, Tempo) do doc 12 §4 ainda não existe; a API também não emite OTel | passo 10 | média |
| TD-012 | Lista oficial de categorias padrão do onboarding (RF-ONB-02) não definida pelo produto; o seed de dev usa um conjunto sintético | passo 10 | média (antes do onboarding) |
| TD-013 | `dev:worktree` não detecta colisão de porta entre duas worktrees que caiam no mesmo slot (chance ~1/1000 por par); hoje o Docker falha com "port is already allocated" | passo 10 | baixa |
