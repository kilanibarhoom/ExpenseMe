import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useSettings } from '@/lib/settings-store';

import migrations from '../../drizzle/migrations';
import { db } from './client';
import { seedIfEmpty } from './seed';

/** Gates the app until migrations have run, seed data exists and settings are hydrated. */
export function DbProvider({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const hydrate = useSettings((s) => s.hydrate);

  useEffect(() => {
    if (success) {
      seedIfEmpty()
        .then(hydrate)
        .then(() => setSeeded(true));
    }
  }, [success, hydrate]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>Database migration failed: {error.message}</Text>
      </View>
    );
  }
  if (!success || !seeded) {
    return null;
  }
  return <>{children}</>;
}
