import { pullRemote } from './pull';
import { pushOutbox } from './push';
import { getSyncState, markSynced } from './state';

export { getSyncState } from './state';
export type { SyncStateRow } from './state';
export { useSync } from './useSync';

/**
 * Push queued local writes, then pull anything new from Neon. Safe to call
 * whenever connectivity might be available — network failures are caught and
 * simply leave state as-is for the next attempt.
 */
export async function syncAll(): Promise<{ ok: boolean }> {
  try {
    await pushOutbox();
    const { lastPulledAt } = await getSyncState();
    await pullRemote(lastPulledAt);
    await markSynced();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
