import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/local-schema.ts',
  out: './drizzle/local',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
