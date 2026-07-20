import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './local-schema';

export const sqlite = openDatabaseSync('kilani.db', { enableChangeListener: false });
sqlite.execSync('PRAGMA journal_mode = WAL;');
sqlite.execSync('PRAGMA foreign_keys = ON;');

/** On-device SQLite mirror — source of truth for all reads/writes. See src/features/sync for Neon sync. */
export const localDb = drizzle(sqlite, { schema });

/** The transaction handle passed into `localDb.transaction((tx) => ...)` callbacks. */
export type LocalTx = Parameters<Parameters<typeof localDb.transaction>[0]>[0];
