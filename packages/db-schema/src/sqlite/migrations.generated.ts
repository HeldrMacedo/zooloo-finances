// Gerado por `pnpm --filter @zooloo/db-schema db:generate`. Não edite à mão.
import type { LocalMigration } from './migrator.js';

export const LOCAL_MIGRATIONS: readonly LocalMigration[] = [
  {
    tag: '0000_init',
    statements: [
      'CREATE TABLE `categories` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`user_id` text NOT NULL,\n\t`created_at` text NOT NULL,\n\t`updated_at` text NOT NULL,\n\t`deleted_at` text,\n\t`server_version` integer DEFAULT 0 NOT NULL,\n\t`hlc` text NOT NULL,\n\t`profile_id` text NOT NULL,\n\t`type` text NOT NULL,\n\t`name` text NOT NULL,\n\t`parent_id` text,\n\t`icon` text NOT NULL,\n\t`color` text NOT NULL,\n\t`is_system` integer DEFAULT false NOT NULL,\n\t`archived_at` text,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\tFOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,\n\tFOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action\n);',
      'CREATE INDEX `categories_profile_idx` ON `categories` (`profile_id`);',
      "CREATE TABLE `profiles` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`user_id` text NOT NULL,\n\t`created_at` text NOT NULL,\n\t`updated_at` text NOT NULL,\n\t`deleted_at` text,\n\t`server_version` integer DEFAULT 0 NOT NULL,\n\t`hlc` text NOT NULL,\n\t`name` text NOT NULL,\n\t`currency` text NOT NULL,\n\t`color` text NOT NULL,\n\t`icon` text NOT NULL,\n\t`archived_at` text,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\t`settings` text DEFAULT '{}' NOT NULL\n);",
    ],
  },
  {
    tag: '0001_categories_name_unique',
    statements: [
      "-- Nome único por (perfil, tipo, pai), sem diferenciar maiúsculas (RN-CAT-07), igual ao servidor.\n-- Escrito à mão porque o drizzle-kit 0.31 gera este índice de expressão com SQL inválido (TD-005).\nCREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`profile_id`, `type`, coalesce(`parent_id`, ''), lower(`name`)) WHERE `deleted_at` IS NULL;",
    ],
  },
];
