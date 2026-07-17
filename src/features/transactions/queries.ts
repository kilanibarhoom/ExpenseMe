import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { categories, transactions, transfers } from '@/db/schema';
import type { Currency } from '@/lib/money';

export interface TxItem {
  kind: 'tx';
  id: string;
  accountId: string;
  type: 'expense' | 'income';
  amountMinor: number;
  currency: Currency;
  note: string | null;
  occurredAt: Date;
  fxRateToIls: number | null;
  categoryId: string;
  categoryKey: string | null;
  categoryLabelEn: string | null;
  categoryLabelAr: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
}

export interface TransferItem {
  kind: 'transfer';
  id: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmountMinor: number;
  toAmountMinor: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  note: string | null;
  occurredAt: Date;
}

export type ActivityItem = TxItem | TransferItem;

export interface ActivityFilter {
  accountId?: string;
  type?: 'expense' | 'income';
  categoryId?: string;
  search?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  includeTransfers?: boolean;
}

/** Live merged feed of transactions (+ optionally transfers), newest first. */
export function useActivity(filter: ActivityFilter = {}): { items: ActivityItem[]; loaded: boolean } {
  const txQuery = useLiveQuery(
    db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        note: transactions.note,
        occurredAt: transactions.occurredAt,
        fxRateToIls: transactions.fxRateToIls,
        categoryId: transactions.categoryId,
        categoryKey: categories.key,
        categoryLabelEn: categories.labelEn,
        categoryLabelAr: categories.labelAr,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .orderBy(desc(transactions.occurredAt)),
  );
  const trQuery = useLiveQuery(db.select().from(transfers).orderBy(desc(transfers.occurredAt)));

  const txItems: TxItem[] = (txQuery.data ?? []).map((row) => ({
    kind: 'tx',
    id: row.id,
    accountId: row.accountId,
    type: row.type,
    amountMinor: row.amount,
    currency: row.currency,
    note: row.note,
    occurredAt: row.occurredAt,
    fxRateToIls: row.fxRateToIls,
    categoryId: row.categoryId,
    categoryKey: row.categoryKey,
    categoryLabelEn: row.categoryLabelEn,
    categoryLabelAr: row.categoryLabelAr,
    categoryIcon: row.categoryIcon,
    categoryColor: row.categoryColor,
  }));

  const trItems: TransferItem[] = (filter.includeTransfers ?? true)
    ? (trQuery.data ?? []).map((row) => ({
        kind: 'transfer',
        id: row.id,
        fromAccountId: row.fromAccountId,
        toAccountId: row.toAccountId,
        fromAmountMinor: row.fromAmount,
        toAmountMinor: row.toAmount,
        fromCurrency: row.fromCurrency,
        toCurrency: row.toCurrency,
        note: row.note,
        occurredAt: row.occurredAt,
      }))
    : [];

  let items: ActivityItem[] = [...txItems, ...trItems];

  if (filter.accountId) {
    items = items.filter((item) =>
      item.kind === 'tx'
        ? item.accountId === filter.accountId
        : item.fromAccountId === filter.accountId || item.toAccountId === filter.accountId,
    );
  }
  if (filter.type) {
    items = items.filter((item) => item.kind === 'tx' && item.type === filter.type);
  }
  if (filter.categoryId) {
    items = items.filter((item) => item.kind === 'tx' && item.categoryId === filter.categoryId);
  }
  if (filter.search && filter.search.trim() !== '') {
    const q = filter.search.trim().toLowerCase();
    items = items.filter((item) => (item.note ?? '').toLowerCase().includes(q));
  }
  if (filter.from) {
    items = items.filter((item) => item.occurredAt >= filter.from!);
  }
  if (filter.to) {
    items = items.filter((item) => item.occurredAt <= filter.to!);
  }

  items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  if (filter.limit) items = items.slice(0, filter.limit);

  return { items, loaded: txQuery.updatedAt !== undefined && trQuery.updatedAt !== undefined };
}

export function useCategories(kind?: 'expense' | 'income') {
  const query = useLiveQuery(
    kind
      ? db.select().from(categories).where(eq(categories.kind, kind)).orderBy(categories.sortOrder)
      : db.select().from(categories).orderBy(categories.kind, categories.sortOrder),
    [kind],
  );
  return query.data ?? [];
}
