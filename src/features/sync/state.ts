import { eq } from 'drizzle-orm';

import { localDb } from '@/db/local';
import { syncState } from '@/db/local-schema';

export interface SyncStateRow {
  bootstrapped: boolean;
  lastPulledAt: Date | null;
}

export async function getSyncState(): Promise<SyncStateRow> {
  const [row] = await localDb.select().from(syncState).where(eq(syncState.id, 'singleton'));
  return {
    bootstrapped: row?.bootstrapped ?? false,
    lastPulledAt: row?.lastPulledAt ? new Date(row.lastPulledAt) : null,
  };
}

export async function markSynced(): Promise<void> {
  const now = new Date().toISOString();
  const [existing] = await localDb.select({ id: syncState.id }).from(syncState).where(eq(syncState.id, 'singleton'));
  if (existing) {
    await localDb
      .update(syncState)
      .set({ bootstrapped: true, lastPulledAt: now })
      .where(eq(syncState.id, 'singleton'));
  } else {
    await localDb.insert(syncState).values({ id: 'singleton', bootstrapped: true, lastPulledAt: now });
  }
}
