-- RLS também para o dono das tabelas: nenhuma consulta escapa das políticas por engano (doc 10 §5).
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- O papel da aplicação só manipula linhas; DDL fica com o papel de migração.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO zooloo_app;--> statement-breakpoint
GRANT USAGE ON TYPE "public"."category_type" TO zooloo_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "users", "profiles", "categories" TO zooloo_app;
