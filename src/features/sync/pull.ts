import { gt } from 'drizzle-orm';

import { db as remoteDb } from '@/db/client';
import { localDb } from '@/db/local';
import * as local from '@/db/local-schema';
import { accounts, categories, debtEntries, debts, fxRates, settings, transactions, transfers } from '@/db/schema';

import { hasPendingChange } from './outbox';

/**
 * Pulls remote rows into the local mirror, skipping any row that has an
 * unpushed local change (that row's push will win instead). Accounts and
 * transactions pull incrementally via `updatedAt`; everything else is small
 * enough — and, since this device is the only writer to Neon, safe enough —
 * to full-refresh every sync.
 */
export async function pullRemote(lastPulledAt: Date | null): Promise<void> {
  const remoteAccounts = lastPulledAt
    ? await remoteDb.select().from(accounts).where(gt(accounts.updatedAt, lastPulledAt))
    : await remoteDb.select().from(accounts);
  for (const row of remoteAccounts) {
    if (await hasPendingChange('accounts', row.id)) continue;
    const { id, ...set } = row;
    await localDb.insert(local.accounts).values(row).onConflictDoUpdate({ target: local.accounts.id, set });
  }

  const remoteTx = lastPulledAt
    ? await remoteDb.select().from(transactions).where(gt(transactions.updatedAt, lastPulledAt))
    : await remoteDb.select().from(transactions);
  for (const row of remoteTx) {
    if (await hasPendingChange('transactions', row.id)) continue;
    const { id, ...set } = row;
    await localDb.insert(local.transactions).values(row).onConflictDoUpdate({ target: local.transactions.id, set });
  }

  for (const row of await remoteDb.select().from(transfers)) {
    if (await hasPendingChange('transfers', row.id)) continue;
    const { id, ...set } = row;
    await localDb.insert(local.transfers).values(row).onConflictDoUpdate({ target: local.transfers.id, set });
  }

  for (const row of await remoteDb.select().from(debts)) {
    if (await hasPendingChange('debts', row.id)) continue;
    const { id, ...set } = row;
    await localDb.insert(local.debts).values(row).onConflictDoUpdate({ target: local.debts.id, set });
  }

  for (const row of await remoteDb.select().from(debtEntries)) {
    if (await hasPendingChange('debtEntries', row.id)) continue;
    const { id, ...set } = row;
    await localDb.insert(local.debtEntries).values(row).onConflictDoUpdate({ target: local.debtEntries.id, set });
  }

  for (const row of await remoteDb.select().from(categories)) {
    if (await hasPendingChange('categories', row.id)) continue;
    const { id, ...set } = row;
    await localDb.insert(local.categories).values(row).onConflictDoUpdate({ target: local.categories.id, set });
  }

  for (const row of await remoteDb.select().from(fxRates)) {
    if (await hasPendingChange('fxRates', row.id)) continue;
    const { id, ...set } = row;
    await localDb.insert(local.fxRates).values(row).onConflictDoUpdate({ target: local.fxRates.id, set });
  }

  for (const row of await remoteDb.select().from(settings)) {
    if (await hasPendingChange('settings', row.id)) continue;
    const { id, ...set } = row;
    await localDb.insert(local.settings).values(row).onConflictDoUpdate({ target: local.settings.id, set });
  }
}
