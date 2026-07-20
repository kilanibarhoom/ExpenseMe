import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSyncState, syncAll, useSync } from '@/features/sync';
import { useSettings } from '@/lib/settings-store';
import { radii, useThemeColors } from '@/lib/theme';

import migrations from '../../drizzle/local/migrations';
import { localDb } from './local';
import { seedLocalIfEmpty } from './seedLocal';

type BootStatus = 'migrating' | 'bootstrapping' | 'ready' | 'bootstrap-error';

/**
 * Boots the app from the local SQLite mirror — the only thing that can block
 * startup is the *first-ever* launch, when the device still needs one
 * successful pull from Neon to import existing data. Every launch after that
 * is instant and fully offline; background sync is handled by useSync().
 */
export function DbProvider({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  const { success: migrated, error: migrationError } = useMigrations(localDb, migrations);
  const [status, setStatus] = useState<BootStatus>('migrating');
  const [error, setError] = useState<Error | null>(null);
  const hydrate = useSettings((s) => s.hydrate);

  const bootstrap = async () => {
    setStatus('bootstrapping');
    setError(null);
    try {
      const { bootstrapped } = await getSyncState();
      if (!bootstrapped) {
        const result = await syncAll();
        if (!result.ok) throw new Error('Could not reach Neon to import your existing data.');
      }
      await seedLocalIfEmpty();
      await hydrate();
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus('bootstrap-error');
    }
  };

  useEffect(() => {
    if (migrated) void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [migrated]);

  useSync(status === 'ready');

  if (migrationError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Could not set up local storage</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>{migrationError.message}</Text>
      </View>
    );
  }

  if (status === 'bootstrap-error') {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>One-time setup needs a connection</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {error?.message ?? 'Unknown error'}
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          After this first import, the app works fully offline.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={bootstrap}
          style={[styles.retryButton, { backgroundColor: colors.chipActive }]}
        >
          <Text style={[styles.retryLabel, { color: colors.chipActiveText }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (status !== 'ready') {
    return null;
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14, textAlign: 'center' },
  hint: { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: radii.control },
  retryLabel: { fontWeight: '600' },
});
