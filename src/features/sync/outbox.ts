import { and, asc, eq } from 'drizzle-orm';

import { localDb } from '@/db/local';
import { syncOutbox } from '@/db/local-schema';

/** Every table replicated between the local SQLite mirror and Neon. */
export type SyncTableName =
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'transfers'
  | 'debts'
  | 'debtEntries'
  | 'fxRates'
  | 'settings';

/**
 * Records that a row changed locally. Carries no payload — push reads the
 * row's current state straight from the local DB, so redundant enqueues for
 * the same row just re-push the same final state (harmless, idempotent).
 */
export async function enqueueChange(
  table: SyncTableName,
  rowId: string,
  op: 'insert' | 'update' | 'delete',
): Promise<void> {
  await localDb.insert(syncOutbox).values({ table, rowId, op, createdAt: new Date().toISOString() });
}

export function getOutboxEntries() {
  return localDb.select().from(syncOutbox).orderBy(asc(syncOutbox.id));
}

export async function removeOutboxEntry(id: number): Promise<void> {
  await localDb.delete(syncOutbox).where(eq(syncOutbox.id, id));
}

/** True when a row has an unpushed local change — pull should not overwrite it. */
export async function hasPendingChange(table: SyncTableName, rowId: string): Promise<boolean> {
  const rows = await localDb
    .select({ id: syncOutbox.id })
    .from(syncOutbox)
    .where(and(eq(syncOutbox.table, table), eq(syncOutbox.rowId, rowId)))
    .limit(1);
  return rows.length > 0;
}
