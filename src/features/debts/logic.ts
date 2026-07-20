import type { Currency } from '@/lib/money';

export interface DebtSnapshot {
  principal: number;
  remaining: number;
  status: 'active' | 'completed';
}

/**
 * Pure ledger transition (spec rules 6–7): payments clamp remaining to ≥0 and
 * complete at 0; increases raise principal+remaining and reactivate.
 */
export function applyEntry(
  debt: DebtSnapshot,
  entry: { kind: 'payment' | 'increase'; amount: number },
): DebtSnapshot {
  if (entry.kind === 'payment') {
    const remaining = Math.max(0, debt.remaining - entry.amount);
    return {
      principal: debt.principal,
      remaining,
      status: remaining === 0 ? 'completed' : 'active',
    };
  }
  const remaining = debt.remaining + entry.amount;
  return {
    principal: debt.principal + entry.amount,
    remaining,
    status: remaining > 0 ? 'active' : debt.status,
  };
}

/**
 * Recompute a debt snapshot from scratch by folding its entries in chronological
 * order over `applyEntry`, starting from the original principal. Used when an entry
 * is deleted (or otherwise mutated), since payments clamp at 0 and increases raise
 * principal — so the running total can only be rebuilt, not adjusted in place.
 *
 * `entries` must be ordered oldest-first (the order they were originally applied).
 */
export function foldEntries(
  originalPrincipal: number,
  entries: { kind: 'payment' | 'increase'; amount: number }[],
): DebtSnapshot {
  let snapshot: DebtSnapshot = {
    principal: originalPrincipal,
    remaining: originalPrincipal,
    status: originalPrincipal === 0 ? 'completed' : 'active',
  };
  for (const entry of entries) {
    snapshot = applyEntry(snapshot, entry);
  }
  return snapshot;
}

/** Spec rule 8: per-currency summary buckets — never converted. */
export function perCurrencyTotals(
  debts: { direction: 'i_owe' | 'owed_to_me'; currency: Currency; remainingAmount: number }[],
): Record<'i_owe' | 'owed_to_me', Partial<Record<Currency, number>>> {
  const totals: Record<'i_owe' | 'owed_to_me', Partial<Record<Currency, number>>> = {
    i_owe: {},
    owed_to_me: {},
  };
  for (const debt of debts) {
    const bucket = totals[debt.direction];
    bucket[debt.currency] = (bucket[debt.currency] ?? 0) + debt.remainingAmount;
  }
  return totals;
}
