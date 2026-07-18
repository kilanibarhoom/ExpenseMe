CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"currency" text NOT NULL,
	"initial_balance" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"color" text,
	"icon" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"label_en" text NOT NULL,
	"label_ar" text NOT NULL,
	"icon" text,
	"color" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debt_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"debt_id" text NOT NULL,
	"kind" text NOT NULL,
	"amount" integer NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" text PRIMARY KEY NOT NULL,
	"direction" text NOT NULL,
	"person_name" text NOT NULL,
	"currency" text NOT NULL,
	"principal_amount" integer NOT NULL,
	"remaining_amount" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"quote" text NOT NULL,
	"rate_to_ils" real NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "fx_rates_quote_unique" UNIQUE("quote")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"default_account_id" text,
	"base_currency" text DEFAULT 'ILS' NOT NULL,
	"last_fx_sync_at" timestamp with time zone,
	"locale" text DEFAULT 'en' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"fx_refresh_hours" integer DEFAULT 12 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"category_id" text NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"fx_rate_to_ils" real,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"from_account_id" text NOT NULL,
	"to_account_id" text NOT NULL,
	"from_amount" integer NOT NULL,
	"to_amount" integer NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"implied_rate" real,
	"note" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "debt_entries" ADD CONSTRAINT "debt_entries_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_account_id_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;