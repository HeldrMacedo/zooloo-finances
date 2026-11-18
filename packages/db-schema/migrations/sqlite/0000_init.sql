CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_version` integer DEFAULT 0 NOT NULL,
	`hlc` text NOT NULL,
	`profile_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `categories_profile_idx` ON `categories` (`profile_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_version` integer DEFAULT 0 NOT NULL,
	`hlc` text NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`archived_at` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL
);
