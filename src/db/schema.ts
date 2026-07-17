import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const CURRENCY_ENUM = ['ILS', 'JOD', 'USD'] as const;

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
};

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['cash', 'bank'] }).notNull(),
  currency: text('currency', { enum: CURRENCY_ENUM }).notNull(),
  initialBalance: integer('initial_balance').notNull().default(0),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  color: text('color'),
  icon: text('icon'),
  archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
  ...timestamps,
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  key: text('key').notNull(),
  labelEn: text('label_en').notNull(),
  labelAr: text('label_ar').notNull(),
  icon: text('icon'),
  color: text('color'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const transactions = sqliteTable('transactions', {
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
  occurredAt: integer('occurred_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  fxRateToIls: real('fx_rate_to_ils'),
  ...timestamps,
});

export const transfers = sqliteTable('transfers', {
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
  occurredAt: integer('occurred_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const debts = sqliteTable('debts', {
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
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
});

export const debtEntries = sqliteTable('debt_entries', {
  id: text('id').primaryKey(),
  debtId: text('debt_id')
    .notNull()
    .references(() => debts.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['payment', 'increase'] }).notNull(),
  amount: integer('amount').notNull(),
  note: text('note'),
  occurredAt: integer('occurred_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const fxRates = sqliteTable('fx_rates', {
  id: text('id').primaryKey(),
  quote: text('quote', { enum: ['USD', 'JOD'] }).notNull().unique(),
  rateToIls: real('rate_to_ils').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull(),
  source: text('source').notNull(),
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(), // always 'singleton'
  defaultAccountId: text('default_account_id'),
  baseCurrency: text('base_currency').notNull().default('ILS'),
  lastFxSyncAt: integer('last_fx_sync_at', { mode: 'timestamp_ms' }),
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
