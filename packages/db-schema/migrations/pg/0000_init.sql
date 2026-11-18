CREATE TYPE "public"."category_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3) with time zone,
	"server_version" bigint DEFAULT 0 NOT NULL,
	"hlc" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"type" "category_type" NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp (3) with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_id_profile_unique" UNIQUE("id","profile_id"),
	CONSTRAINT "categories_not_own_parent" CHECK ("categories"."parent_id" <> "categories"."id")
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3) with time zone,
	"server_version" bigint DEFAULT 0 NOT NULL,
	"hlc" text NOT NULL,
	"name" text NOT NULL,
	"currency" char(3) NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"archived_at" timestamp (3) with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "profiles_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "profiles_currency_iso" CHECK ("profiles"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp (3) with time zone,
	"name" text NOT NULL,
	"birth_date" date,
	"password_hash" text,
	"locale" text DEFAULT 'pt-BR' NOT NULL,
	"timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deletion_scheduled_at" timestamp (3) with time zone,
	"wrapped_dek" "bytea" NOT NULL,
	"totp_secret_enc" "bytea",
	"recovery_codes_hash" text[],
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_profile_fk" FOREIGN KEY ("profile_id","user_id") REFERENCES "public"."profiles"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_fk" FOREIGN KEY ("parent_id","profile_id") REFERENCES "public"."categories"("id","profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree ("profile_id","type",coalesce("parent_id", '00000000-0000-0000-0000-000000000000'::uuid),lower("name")) WHERE "categories"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_system_unique" ON "categories" USING btree ("profile_id","type") WHERE "categories"."is_system" and "categories"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "categories_profile_idx" ON "categories" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE POLICY "owner_select" ON "categories" AS PERMISSIVE FOR SELECT TO "zooloo_app" USING ("categories"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_insert" ON "categories" AS PERMISSIVE FOR INSERT TO "zooloo_app" WITH CHECK ("categories"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_update" ON "categories" AS PERMISSIVE FOR UPDATE TO "zooloo_app" USING ("categories"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid) WITH CHECK ("categories"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_delete" ON "categories" AS PERMISSIVE FOR DELETE TO "zooloo_app" USING ("categories"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_select" ON "profiles" AS PERMISSIVE FOR SELECT TO "zooloo_app" USING ("profiles"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_insert" ON "profiles" AS PERMISSIVE FOR INSERT TO "zooloo_app" WITH CHECK ("profiles"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_update" ON "profiles" AS PERMISSIVE FOR UPDATE TO "zooloo_app" USING ("profiles"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid) WITH CHECK ("profiles"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_delete" ON "profiles" AS PERMISSIVE FOR DELETE TO "zooloo_app" USING ("profiles"."user_id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_select" ON "users" AS PERMISSIVE FOR SELECT TO "zooloo_app" USING ("users"."id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_insert" ON "users" AS PERMISSIVE FOR INSERT TO "zooloo_app" WITH CHECK ("users"."id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_update" ON "users" AS PERMISSIVE FOR UPDATE TO "zooloo_app" USING ("users"."id" = nullif(current_setting('app.user_id', true), '')::uuid) WITH CHECK ("users"."id" = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner_delete" ON "users" AS PERMISSIVE FOR DELETE TO "zooloo_app" USING ("users"."id" = nullif(current_setting('app.user_id', true), '')::uuid);