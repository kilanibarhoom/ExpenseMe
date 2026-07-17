import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, spacing, useThemeColors } from '@/lib/theme';

/** White rounded content card — always solid, never glass (spec §9). */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useThemeColors();
  return <View style={[styles.card, { backgroundColor: colors.card }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    padding: spacing.l,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
