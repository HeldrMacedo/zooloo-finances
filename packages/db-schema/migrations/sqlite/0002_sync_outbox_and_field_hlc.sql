CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`record_id` text NOT NULL,
	`op` text NOT NULL,
	`fields` text NOT NULL,
	`hlc` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `categories` ADD `field_hlc` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `field_hlc` text DEFAULT '{}' NOT NULL;