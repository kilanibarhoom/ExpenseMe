import { eq } from 'drizzle-orm';

import { db as remoteDb } from '@/db/client';
import { localDb } from '@/db/local';
import * as local from '@/db/local-schema';
import { accounts, categories, debtEntries, debts, fxRates, settings, transactions, transfers } from '@/db/schema';

import { getOutboxEntries, removeOutboxEntry, type SyncTableName } from './outbox';

async function pushDelete(table: SyncTableName, rowId: string): Promise<void> {
  switch (table) {
    case 'accounts':
      await remoteDb.delete(accounts).where(eq(accounts.id, rowId));
      return;
    case 'categories':
      await remoteDb.delete(categories).where(eq(categories.id, rowId));
      return;
    case 'transactions':
      await remoteDb.delete(transactions).where(eq(transactions.id, rowId));
      return;
    case 'transfers':
      await remoteDb.delete(transfers).where(eq(transfers.id, rowId));
      return;
    case 'debts':
      await remoteDb.delete(debts).where(eq(debts.id, rowId));
      return;
    case 'debtEntries':
      await remoteDb.delete(debtEntries).where(eq(debtEntries.id, rowId));
      return;
    case 'fxRates':
      await remoteDb.delete(fxRates).where(eq(fxRates.id, rowId));
      return;
    case 'settings':
      // Singleton row; never deleted.
      return;
  }
}

async function pushUpsert(table: SyncTableName, rowId: string): Promise<void> {
  switch (table) {
    case 'accounts': {
      const [row] = await localDb.select().from(local.accounts).where(eq(local.accounts.id, rowId));
      if (!row) return;
      const { id, ...set } = row;
      await remoteDb.insert(accounts).values(row).onConflictDoUpdate({ target: accounts.id, set });
      return;
    }
    case 'categories': {
      const [row] = await localDb.select().from(local.categories).where(eq(local.categories.id, rowId));
      if (!row) return;
      const { id, ...set } = row;
      await remoteDb.insert(categories).values(row).onConflictDoUpdate({ target: categories.id, set });
      return;
    }
    case 'transactions': {
      const [row] = await localDb.select().from(local.transactions).where(eq(local.transactions.id, rowId));
      if (!row) return;
      const { id, ...set } = row;
      await remoteDb.insert(transactions).values(row).onConflictDoUpdate({ target: transactions.id, set });
      return;
    }
    case 'transfers': {
      const [row] = await localDb.select().from(local.transfers).where(eq(local.transfers.id, rowId));
      if (!row) return;
      const { id, ...set } = row;
      await remoteDb.insert(transfers).values(row).onConflictDoUpdate({ target: transfers.id, set });
      return;
    }
    case 'debts': {
      const [row] = await localDb.select().from(local.debts).where(eq(local.debts.id, rowId));
      if (!row) return;
      const { id, ...set } = row;
      await remoteDb.insert(debts).values(row).onConflictDoUpdate({ target: debts.id, set });
      return;
    }
    case 'debtEntries': {
      const [row] = await localDb.select().from(local.debtEntries).where(eq(local.debtEntries.id, rowId));
      if (!row) return;
      const { id, ...set } = row;
      await remoteDb.insert(debtEntries).values(row).onConflictDoUpdate({ target: debtEntries.id, set });
      return;
    }
    case 'fxRates': {
      const [row] = await localDb.select().from(local.fxRates).where(eq(local.fxRates.id, rowId));
      if (!row) return;
      const { id, ...set } = row;
      await remoteDb.insert(fxRates).values(row).onConflictDoUpdate({ target: fxRates.id, set });
      return;
    }
    case 'settings': {
      const [row] = await localDb.select().from(local.settings).where(eq(local.settings.id, rowId));
      if (!row) return;
      const { id, ...set } = row;
      await remoteDb.insert(settings).values(row).onConflictDoUpdate({ target: settings.id, set });
      return;
    }
  }
}

/**
 * Replays queued local writes against Neon, oldest first. Stops at the first
 * failure (network drop, mid-flight) and leaves the remainder queued for the
 * next sync pass.
 */
export async function pushOutbox(): Promise<{ pushed: number; failed: boolean }> {
  const entries = await getOutboxEntries();
  let pushed = 0;
  for (const entry of entries) {
    try {
      const table = entry.table as SyncTableName;
      if (entry.op === 'delete') {
        await pushDelete(table, entry.rowId);
      } else {
        await pushUpsert(table, entry.rowId);
      }
      await removeOutboxEntry(entry.id);
      pushed++;
    } catch {
      return { pushed, failed: true };
    }
  }
  return { pushed, failed: false };
}
