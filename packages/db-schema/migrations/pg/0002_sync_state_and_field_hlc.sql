CREATE TABLE "sync_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "field_hlc" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "field_hlc" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_state" ADD CONSTRAINT "sync_state_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_sync_idx" ON "categories" USING btree ("user_id","server_version");--> statement-breakpoint
CREATE INDEX "profiles_sync_idx" ON "profiles" USING btree ("user_id","server_version");--> statement-breakpoint
CREATE POLICY "owner_select" ON "sync_state" AS PERMISSIVE FOR SELECT TO "zooloo_app" USING ("sync_state"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_insert" ON "sync_state" AS PERMISSIVE FOR INSERT TO "zooloo_app" WITH CHECK ("sync_state"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_update" ON "sync_state" AS PERMISSIVE FOR UPDATE TO "zooloo_app" USING ("sync_state"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid) WITH CHECK ("sync_state"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_delete" ON "sync_state" AS PERMISSIVE FOR DELETE TO "zooloo_app" USING ("sync_state"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);