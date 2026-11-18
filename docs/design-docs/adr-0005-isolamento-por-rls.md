# ADR-0005 — Isolamento entre usuários por RLS no PostgreSQL

- Status: aceito
- Data: 2026-11-18
- Risco: alto (doc 12 §6.2)

## Contexto

RNF-SEG-08 e doc 10 §5 exigem isolamento por usuário com Row-Level Security, e o doc 12 §5.2 exige que nenhuma tabela de dados do usuário exista sem RLS. Um esquecimento de `where user_id = …` no código não pode vazar dados (F7, IDOR).

## Decisão

1. **Papéis**: `zooloo_owner` é dono das tabelas e roda as migrações; `zooloo_app` é usado pela API e pelos workers, sem `SUPERUSER`, sem `BYPASSRLS` e sem ser dono de nada. Os dois são criados pela infraestrutura (`pgRole(...).existing()`).
2. **Contexto por transação**: a camada Repo abre toda transação com `select set_config('app.user_id', <uuid>, true)` (`userContext()` em `@zooloo/db-schema`). O `true` limita o valor à transação, para não vazar entre requisições que reutilizam a conexão do pool. Sem contexto, nenhuma linha é visível.
3. **Políticas**: cada tabela tem quatro políticas (`select`, `insert`, `update`, `delete`) só para `zooloo_app`, comparando a coluna dona com `current_setting('app.user_id', true)`. `ENABLE` e `FORCE ROW LEVEL SECURITY` em todas.
4. **`user_id` em toda tabela de dados**, inclusive as de perfil (desvio do doc 05, que só lista `profile_id`): a política compara uma coluna, sem subconsulta, e o particionamento por usuário (RNF-DSP-05) fica possível.
5. **FKs compostas** impedem referência cruzada mesmo com o `user_id` correto: `categories(profile_id, user_id) → profiles(id, user_id)` e `categories(parent_id, profile_id) → categories(id, profile_id)`.
6. **Migrações** geradas pelo drizzle-kit a partir do esquema; `FORCE`, `GRANT` e `REVOKE` em migrações custom. O CI falha se o esquema mudar sem migração.
7. **Teste estrutural** (Testcontainers, PostgreSQL 17): toda tabela do schema `public` tem RLS ativa e forçada, as quatro políticas para `zooloo_app` usando `app.user_id`, e grants da aplicação; as tabelas do banco são exatamente as do esquema Drizzle; `zooloo_app` não é dono, superusuário nem `BYPASSRLS` e não executa DDL. Testes de comportamento cobrem leitura, escrita, update, delete e FK entre usuários.
8. **Banco local (SQLite)** espelha as colunas do servidor; um teste de paridade compara nomes e obrigatoriedade das colunas. No cliente o isolamento é a sessão (o banco local só tem dados do usuário logado).

## Consequências

- Uma tabela nova sem RLS, sem `FORCE` ou sem grant quebra o teste estrutural.
- Fluxos que acontecem antes de existir usuário na transação (login por e-mail, verificação de e-mail, jobs de inatividade) precisam de caminho próprio: função `SECURITY DEFINER` estreita ou papel de serviço dedicado. A decisão fica para o passo de autenticação (TD-006).
- Os testes do `@zooloo/db-schema` exigem Docker.
