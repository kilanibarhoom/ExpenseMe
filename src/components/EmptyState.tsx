import { StyleSheet, Text, View } from 'react-native';

import { spacing, useThemeColors } from '@/lib/theme';

/** Centered 3D-emoji illustration + hint, used for every empty list. */
export function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji} accessibilityElementsHidden>
        {emoji}
      </Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.s },
  emoji: { fontSize: 64, marginBottom: spacing.s },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14, textAlign: 'center' },
});
