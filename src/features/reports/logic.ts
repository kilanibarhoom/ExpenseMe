import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';

import { convertToIlsMinor, type Currency } from '@/lib/money';

export type PeriodKind = 'day' | 'week' | 'month' | 'year' | 'custom';

export interface Period {
  kind: PeriodKind;
  start: Date;
  end: Date;
}

export function periodRange(
  kind: PeriodKind,
  ref: Date,
  custom?: { start: Date; end: Date },
): Period {
  switch (kind) {
    case 'day':
      return { kind, start: startOfDay(ref), end: endOfDay(ref) };
    case 'week':
      return {
        kind,
        start: startOfWeek(ref, { weekStartsOn: 1 }),
        end: endOfWeek(ref, { weekStartsOn: 1 }),
      };
    case 'month':
      return { kind, start: startOfMonth(ref), end: endOfMonth(ref) };
    case 'year':
      return { kind, start: startOfYear(ref), end: endOfYear(ref) };
    case 'custom':
      return {
        kind,
        start: startOfDay(custom?.start ?? ref),
        end: endOfDay(custom?.end ?? ref),
      };
  }
}

export interface ReportTx {
  type: 'expense' | 'income';
  amountMinor: number;
  currency: Currency;
  fxRateToIls: number | null;
  occurredAt: Date;
  accountId: string;
  categoryId: string;
  categoryLabelEn: string | null;
  categoryLabelAr: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
}

/**
 * A transaction's value in ILS agorot. `exactAtTime` prefers the rate
 * snapshot stored at creation, falling back to the latest cached rate.
 */
export function txIlsMinor(
  tx: Pick<ReportTx, 'amountMinor' | 'currency' | 'fxRateToIls'>,
  rates: { USD: number; JOD: number },
  exactAtTime: boolean,
): number {
  if (tx.currency === 'ILS') return tx.amountMinor;
  const rate = exactAtTime && tx.fxRateToIls != null ? tx.fxRateToIls : rates[tx.currency];
  return convertToIlsMinor(tx.amountMinor, tx.currency, rate);
}

export interface CategorySlice {
  categoryId: string;
  label: string;
  color: string;
  icon: string;
  ilsMinor: number;
}

/** Expense-by-category slices in ILS, largest first. */
export function sumByCategoryIls(
  txs: ReportTx[],
  rates: { USD: number; JOD: number },
  exactAtTime: boolean,
  locale: string,
): CategorySlice[] {
  const byCategory = new Map<string, CategorySlice>();
  for (const tx of txs) {
    if (tx.type !== 'expense') continue;
    const existing = byCategory.get(tx.categoryId);
    const ils = txIlsMinor(tx, rates, exactAtTime);
    if (existing) {
      existing.ilsMinor += ils;
    } else {
      byCategory.set(tx.categoryId, {
        categoryId: tx.categoryId,
        label: (locale === 'ar' ? tx.categoryLabelAr : tx.categoryLabelEn) ?? '',
        color: tx.categoryColor ?? '#6B7280',
        icon: tx.categoryIcon ?? '💸',
        ilsMinor: ils,
      });
    }
  }
  return [...byCategory.values()].sort((a, b) => b.ilsMinor - a.ilsMinor);
}

export interface SeriesBucket {
  bucketStart: Date;
  incomeIls: number;
  expenseIls: number;
}

/** Month buckets for year-scale ranges, day buckets otherwise. */
export function isMonthlyPeriod(period: Period): boolean {
  return period.kind === 'year' || differenceInCalendarDays(period.end, period.start) > 62;
}

/** Income vs expense over the period: day buckets, or month buckets for year-scale ranges. */
export function incomeVsExpenseSeries(
  txs: ReportTx[],
  period: Period,
  rates: { USD: number; JOD: number },
  exactAtTime: boolean,
): SeriesBucket[] {
  const monthly = isMonthlyPeriod(period);
  const buckets: SeriesBucket[] = [];
  if (monthly) {
    const count = differenceInCalendarMonths(period.end, period.start) + 1;
    for (let i = 0; i < count; i += 1) {
      buckets.push({ bucketStart: addMonths(startOfMonth(period.start), i), incomeIls: 0, expenseIls: 0 });
    }
  } else {
    const count = differenceInCalendarDays(period.end, period.start) + 1;
    for (let i = 0; i < count; i += 1) {
      buckets.push({ bucketStart: addDays(startOfDay(period.start), i), incomeIls: 0, expenseIls: 0 });
    }
  }
  for (const tx of txs) {
    if (tx.occurredAt < period.start || tx.occurredAt > period.end) continue;
    const index = monthly
      ? differenceInCalendarMonths(tx.occurredAt, period.start)
      : differenceInCalendarDays(tx.occurredAt, period.start);
    const bucket = buckets[index];
    if (!bucket) continue;
    const ils = txIlsMinor(tx, rates, exactAtTime);
    if (tx.type === 'income') bucket.incomeIls += ils;
    else bucket.expenseIls += ils;
  }
  return buckets;
}

/** Per-account income/expense subtotals in each account's native minor units. */
export function perAccountSubtotals(
  txs: ReportTx[],
): { accountId: string; incomeMinor: number; expenseMinor: number }[] {
  const byAccount = new Map<string, { accountId: string; incomeMinor: number; expenseMinor: number }>();
  for (const tx of txs) {
    let row = byAccount.get(tx.accountId);
    if (!row) {
      row = { accountId: tx.accountId, incomeMinor: 0, expenseMinor: 0 };
      byAccount.set(tx.accountId, row);
    }
    if (tx.type === 'income') row.incomeMinor += tx.amountMinor;
    else row.expenseMinor += tx.amountMinor;
  }
  return [...byAccount.values()];
}
