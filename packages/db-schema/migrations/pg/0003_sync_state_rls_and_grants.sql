-- RLS forçada e grants da tabela de versão de sync, como nas demais (0001).
ALTER TABLE "sync_state" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "sync_state" TO zooloo_app;
