import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useThemeColors } from '@/lib/theme';

/** Standard screen container: themed background, safe-area top, room for the floating tab bar. */
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + spacing.s },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Bottom padding so scrollable content clears the floating tab bar. */
export const TAB_BAR_CLEARANCE = 120;
