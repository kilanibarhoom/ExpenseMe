import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { localDb as db } from '@/db/local';
import {
  accounts,
  categories,
  debtEntries,
  debts,
  fxRates,
  settings,
  transactions,
  transfers,
} from '@/db/local-schema';

/** Dump every table to a JSON file and open the system share sheet. */
export async function exportDataAsJson(): Promise<void> {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'KilaniExpense',
    version: 1,
    accounts: await db.select().from(accounts),
    categories: await db.select().from(categories),
    transactions: await db.select().from(transactions),
    transfers: await db.select().from(transfers),
    debts: await db.select().from(debts),
    debtEntries: await db.select().from(debtEntries),
    fxRates: await db.select().from(fxRates),
    settings: await db.select().from(settings),
  };
  const file = new File(Paths.cache, `kilaniexpense-export-${Date.now()}.json`);
  file.write(JSON.stringify(payload, null, 2));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
  }
}
