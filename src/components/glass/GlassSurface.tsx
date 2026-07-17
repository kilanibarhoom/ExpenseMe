import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColors } from '@/lib/theme';

let reduceTransparencyCache = false;

function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(reduceTransparencyCache);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((value) => {
      reduceTransparencyCache = value;
      setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceTransparencyChanged', (value) => {
      reduceTransparencyCache = value;
      setReduce(value);
    });
    return () => sub?.remove();
  }, []);
  return reduce;
}

interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Applied only to the solid fallback; glass surfaces stay untinted. */
  fallbackColor?: string;
  isInteractive?: boolean;
}

/**
 * Liquid-glass surface for chrome/controls only (tab bar, FAB, sheets, chips).
 * Falls back to a solid translucent card on iOS ≤ 18, Android, and when the
 * user has reduce-transparency enabled.
 */
export function GlassSurface({ children, style, fallbackColor, isInteractive }: GlassSurfaceProps) {
  const colors = useThemeColors();
  const reduceTransparency = useReduceTransparency();

  if (isLiquidGlassAvailable() && !reduceTransparency) {
    return (
      <GlassView style={style} glassEffectStyle="regular" isInteractive={isInteractive}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[{ backgroundColor: fallbackColor ?? colors.glassFallback }, style]}>
      {children}
    </View>
  );
}
