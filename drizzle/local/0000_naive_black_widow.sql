CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`currency` text NOT NULL,
	`initial_balance` integer DEFAULT 0 NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`color` text,
	`icon` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`label_en` text NOT NULL,
	`label_ar` text NOT NULL,
	`icon` text,
	`color` text,
	`is_system` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `debt_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`debt_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `debt_entries_debt_id_idx` ON `debt_entries` (`debt_id`);--> statement-breakpoint
CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`direction` text NOT NULL,
	`person_name` text NOT NULL,
	`currency` text NOT NULL,
	`principal_amount` integer NOT NULL,
	`remaining_amount` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`quote` text NOT NULL,
	`rate_to_ils` real NOT NULL,
	`fetched_at` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fx_rates_quote_unique` ON `fx_rates` (`quote`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`default_account_id` text,
	`base_currency` text DEFAULT 'ILS' NOT NULL,
	`last_fx_sync_at` text,
	`locale` text DEFAULT 'en' NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`fx_refresh_hours` integer DEFAULT 12 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table` text NOT NULL,
	`row_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`bootstrapped` integer DEFAULT false NOT NULL,
	`last_pulled_at` text
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`category_id` text NOT NULL,
	`note` text,
	`occurred_at` text NOT NULL,
	`fx_rate_to_ils` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactions_account_id_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`from_account_id` text NOT NULL,
	`to_account_id` text NOT NULL,
	`from_amount` integer NOT NULL,
	`to_amount` integer NOT NULL,
	`from_currency` text NOT NULL,
	`to_currency` text NOT NULL,
	`implied_rate` real,
	`note` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`from_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transfers_from_account_id_idx` ON `transfers` (`from_account_id`);--> statement-breakpoint
CREATE INDEX `transfers_to_account_id_idx` ON `transfers` (`to_account_id`);