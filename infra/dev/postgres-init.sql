-- Papéis iguais aos de produção (ADR-0005): o dono roda migrações; a aplicação fica sujeita à RLS.
-- Senhas só para o ambiente local por worktree.
CREATE ROLE zooloo_owner LOGIN PASSWORD 'dev-only-owner' NOSUPERUSER NOBYPASSRLS;
CREATE ROLE zooloo_app LOGIN PASSWORD 'dev-only-app' NOSUPERUSER NOBYPASSRLS;
ALTER DATABASE zooloo OWNER TO zooloo_owner;
ALTER SCHEMA public OWNER TO zooloo_owner;
