import { boolean, customType, integer, pgTable, real, text } from 'drizzle-orm/pg-core';

export const CURRENCY_ENUM = ['ILS', 'JOD', 'USD'] as const;

/**
 * Postgres's text output for `timestamptz` (e.g. "2026-07-17 20:35:10.952+00")
 * uses a space separator and a colon-less UTC offset — not strict ISO 8601.
 * Node's Date parser accepts it, but Hermes (React Native's JS engine) doesn't
 * and throws "Invalid time value". Normalize to ISO 8601 before parsing.
 */
function normalizePgTimestamp(value: string): Date {
  const iso = value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return new Date(iso);
}

const timestamp = customType<{ data: Date; driverData: string }>({
  dataType() {
    return 'timestamp with time zone';
  },
  fromDriver: normalizePgTimestamp,
  toDriver: (value) => value.toISOString(),
});

const timestamps = {
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
};

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['cash', 'bank'] }).notNull(),
  currency: text('currency', { enum: CURRENCY_ENUM }).notNull(),
  balance: integer('balance').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
  color: text('color'),
  icon: text('icon'),
  archivedAt: timestamp('archived_at'),
  ...timestamps,
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  key: text('key').notNull(),
  labelEn: text('label_en').notNull(),
  labelAr: text('label_ar').notNull(),
  icon: text('icon'),
  color: text('color'),
  isSystem: boolean('is_system').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency', { enum: CURRENCY_ENUM }).notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  note: text('note'),
  occurredAt: timestamp('occurred_at')
    .notNull()
    .$defaultFn(() => new Date()),
  fxRateToIls: real('fx_rate_to_ils'),
  ...timestamps,
});

export const transfers = pgTable('transfers', {
  id: text('id').primaryKey(),
  fromAccountId: text('from_account_id')
    .notNull()
    .references(() => accounts.id),
  toAccountId: text('to_account_id')
    .notNull()
    .references(() => accounts.id),
  fromAmount: integer('from_amount').notNull(),
  toAmount: integer('to_amount').notNull(),
  fromCurrency: text('from_currency', { enum: CURRENCY_ENUM }).notNull(),
  toCurrency: text('to_currency', { enum: CURRENCY_ENUM }).notNull(),
  impliedRate: real('implied_rate'),
  note: text('note'),
  occurredAt: timestamp('occurred_at')
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
});

export const debts = pgTable('debts', {
  id: text('id').primaryKey(),
  direction: text('direction', { enum: ['i_owe', 'owed_to_me'] }).notNull(),
  personName: text('person_name').notNull(),
  currency: text('currency', { enum: CURRENCY_ENUM }).notNull(),
  principalAmount: integer('principal_amount').notNull(),
  remainingAmount: integer('remaining_amount').notNull(),
  status: text('status', { enum: ['active', 'completed'] })
    .notNull()
    .default('active'),
  note: text('note'),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: timestamp('completed_at'),
});

export const debtEntries = pgTable('debt_entries', {
  id: text('id').primaryKey(),
  debtId: text('debt_id')
    .notNull()
    .references(() => debts.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['payment', 'increase'] }).notNull(),
  amount: integer('amount').notNull(),
  note: text('note'),
  occurredAt: timestamp('occurred_at')
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
});

export const fxRates = pgTable('fx_rates', {
  id: text('id').primaryKey(),
  quote: text('quote', { enum: ['USD', 'JOD'] }).notNull().unique(),
  rateToIls: real('rate_to_ils').notNull(),
  fetchedAt: timestamp('fetched_at').notNull(),
  source: text('source').notNull(),
});

export const settings = pgTable('settings', {
  id: text('id').primaryKey(), // always 'singleton'
  defaultAccountId: text('default_account_id'),
  baseCurrency: text('base_currency').notNull().default('ILS'),
  lastFxSyncAt: timestamp('last_fx_sync_at'),
  locale: text('locale', { enum: ['en', 'ar'] }).notNull().default('en'),
  theme: text('theme', { enum: ['system', 'light', 'dark'] }).notNull().default('system'),
  fxRefreshHours: integer('fx_refresh_hours').notNull().default(12),
});

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type DebtEntry = typeof debtEntries.$inferSelect;
export type FxRate = typeof fxRates.$inferSelect;
export type Settings = typeof settings.$inferSelect;
