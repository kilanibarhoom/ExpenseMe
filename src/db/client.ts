import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

const connectionString = process.env.EXPO_PUBLIC_DATABASE_URL;
if (!connectionString) {
  throw new Error('EXPO_PUBLIC_DATABASE_URL is not set');
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
