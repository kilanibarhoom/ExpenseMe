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
