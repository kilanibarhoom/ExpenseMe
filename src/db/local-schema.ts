import { customType, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const CURRENCY_ENUM = ['ILS', 'JOD', 'USD'] as const;

/**
 * Mirrors src/db/schema.ts (the Neon/Postgres schema) for the on-device SQLite
 * store. Timestamps are stored as ISO 8601 text and mapped to/from JS `Date`,
 * matching the Postgres `timestamp` custom type so rows round-trip identically
 * through the sync engine and existing query/mutation code needs no changes
 * for date handling.
 */
const timestamp = customType<{ data: Date; driverData: string }>({
  dataType() {
    return 'text';
  },
  fromDriver: (value) => new Date(value),
  toDriver: (value) => value.toISOString(),
});

const timestamps = {
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
};

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['cash', 'bank'] }).notNull(),
  currency: text('currency', { enum: CURRENCY_ENUM }).notNull(),
  balance: integer('balance').notNull().default(0),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  color: text('color'),
  icon: text('icon'),
  archivedAt: timestamp('archived_at'),
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

export const transactions = sqliteTable(
  'transactions',
  {
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
  },
  (table) => [index('transactions_account_id_idx').on(table.accountId)],
);

export const transfers = sqliteTable(
  'transfers',
  {
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
  },
  (table) => [
    index('transfers_from_account_id_idx').on(table.fromAccountId),
    index('transfers_to_account_id_idx').on(table.toAccountId),
  ],
);

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
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: timestamp('completed_at'),
});

export const debtEntries = sqliteTable(
  'debt_entries',
  {
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
  },
  (table) => [index('debt_entries_debt_id_idx').on(table.debtId)],
);

export const fxRates = sqliteTable('fx_rates', {
  id: text('id').primaryKey(),
  quote: text('quote', { enum: ['USD', 'JOD'] }).notNull().unique(),
  rateToIls: real('rate_to_ils').notNull(),
  fetchedAt: timestamp('fetched_at').notNull(),
  source: text('source').notNull(),
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(), // always 'singleton'
  defaultAccountId: text('default_account_id'),
  baseCurrency: text('base_currency').notNull().default('ILS'),
  lastFxSyncAt: timestamp('last_fx_sync_at'),
  locale: text('locale', { enum: ['en', 'ar'] }).notNull().default('en'),
  theme: text('theme', { enum: ['system', 'light', 'dark'] }).notNull().default('system'),
  fxRefreshHours: integer('fx_refresh_hours').notNull().default(12),
});

/**
 * Local-only outbox of unsynced writes, replayed against Neon by the sync
 * engine. Never mirrored to Neon itself, so plain ISO text is fine here.
 */
export const syncOutbox = sqliteTable('sync_outbox', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  table: text('table').notNull(),
  rowId: text('row_id').notNull(),
  op: text('op', { enum: ['insert', 'update', 'delete'] }).notNull(),
  payload: text('payload'), // JSON-serialized row; null for deletes
  createdAt: text('created_at').notNull(),
});

/** Local-only single-row sync bookkeeping. Never mirrored to Neon. */
export const syncState = sqliteTable('sync_state', {
  id: text('id').primaryKey(), // always 'singleton'
  bootstrapped: integer('bootstrapped', { mode: 'boolean' }).notNull().default(false),
  lastPulledAt: text('last_pulled_at'),
});

export type LocalAccount = typeof accounts.$inferSelect;
export type LocalCategory = typeof categories.$inferSelect;
export type LocalTransaction = typeof transactions.$inferSelect;
export type LocalTransfer = typeof transfers.$inferSelect;
export type LocalDebt = typeof debts.$inferSelect;
export type LocalDebtEntry = typeof debtEntries.$inferSelect;
export type LocalFxRate = typeof fxRates.$inferSelect;
export type LocalSettings = typeof settings.$inferSelect;
