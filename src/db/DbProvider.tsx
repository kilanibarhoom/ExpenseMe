import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/lib/settings-store';

import { seedIfEmpty } from './seed';

type Status = 'loading' | 'ready' | 'error';

/** Gates the app until the Neon-backed seed data exists and settings are hydrated. */
export function DbProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<Error | null>(null);
  const hydrate = useSettings((s) => s.hydrate);

  const init = () => {
    setStatus('loading');
    setError(null);
    seedIfEmpty()
      .then(hydrate)
      .then(() => setStatus('ready'))
      .catch((e: Error) => {
        setError(e);
        setStatus('error');
      });
  };

  useEffect(init, [hydrate]);

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Can't reach the database</Text>
        <Text style={styles.body}>
          {error?.message ?? 'Unknown error'}
        </Text>
        <Text style={styles.hint}>Check your internet connection and try again.</Text>
        <Pressable accessibilityRole="button" onPress={init} style={styles.retryButton}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  if (status === 'loading') {
    return null;
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14, textAlign: 'center', color: '#666' },
  hint: { fontSize: 13, textAlign: 'center', color: '#999', marginBottom: 8 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#111', borderRadius: 8 },
  retryLabel: { color: '#fff', fontWeight: '600' },
});
