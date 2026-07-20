import { eq, sql } from 'drizzle-orm';

import type { LocalTx } from '@/db/local';
import { accounts } from '@/db/local-schema';

/**
 * Apply a signed delta (in the account's own currency minor units) to its
 * stored balance via a SQL-level increment, so multiple deltas applied to
 * the same account within one `db.transaction` (a transfer's debit+credit,
 * or an edit's reversal-then-reapply) compose correctly without racing.
 * Must be called from inside an existing `db.transaction((tx) => {...})`
 * callback so the change lands atomically with the row write that caused it.
 */
export function applyBalanceDelta(tx: LocalTx, accountId: string, deltaMinor: number): void {
  if (deltaMinor === 0) return;
  tx.update(accounts)
    .set({ balance: sql`${accounts.balance} + ${deltaMinor}`, updatedAt: new Date() })
    .where(eq(accounts.id, accountId))
    .run();
}
