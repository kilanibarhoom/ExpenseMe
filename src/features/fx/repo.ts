import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { fxRates } from '@/db/schema';
import { newId } from '@/lib/id';

export interface CachedRates {
  USD: number;
  JOD: number;
  fetchedAt: Date | null;
}

/** Reasonable static fallbacks for first launch before any successful fetch. */
export const FALLBACK_RATES: CachedRates = { USD: 3.6, JOD: 5.1, fetchedAt: null };

export async function getCachedRates(): Promise<CachedRates> {
  const rows = await db.select().from(fxRates);
  if (rows.length === 0) return FALLBACK_RATES;
  const result = { ...FALLBACK_RATES };
  let oldest: Date | null = null;
  for (const row of rows) {
    result[row.quote] = row.rateToIls;
    if (!oldest || row.fetchedAt < oldest) oldest = row.fetchedAt;
  }
  result.fetchedAt = oldest;
  return result;
}

export async function upsertRates(
  rates: Record<'USD' | 'JOD', number>,
  source: string,
): Promise<void> {
  const fetchedAt = new Date();
  for (const quote of ['USD', 'JOD'] as const) {
    const [existing] = await db.select().from(fxRates).where(eq(fxRates.quote, quote));
    if (existing) {
      await db
        .update(fxRates)
        .set({ rateToIls: rates[quote], fetchedAt, source })
        .where(eq(fxRates.quote, quote));
    } else {
      await db.insert(fxRates).values({ id: newId(), quote, rateToIls: rates[quote], fetchedAt, source });
    }
  }
}
