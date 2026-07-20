import { Button as SwiftUIButton, Host } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  frame,
  labelStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, useThemeColors } from '@/lib/theme';

interface NativeButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** Defaults to the theme's blue accent. */
  tint?: string;
  accessibilityLabel?: string;
  /** Optional SF Symbol shown beside the label. */
  systemImage?: SFSymbol;
  /** Fallback icon for Android/web, from Ionicons — shown when `systemImage` is set. */
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
}

/**
 * A native, filled, accent-tinted button. Uses a real SwiftUI button on iOS
 * (bordered-prominent style) so it picks up system press/haptic behavior;
 * falls back to a themed Pressable everywhere else.
 */
export function NativeButton({
  title,
  onPress,
  disabled,
  tint: tintColor,
  accessibilityLabel,
  systemImage,
  fallbackIcon,
}: NativeButtonProps) {
  const colors = useThemeColors();
  const resolvedTint = tintColor ?? colors.blue;

  if (Platform.OS === 'ios') {
    return (
      <Host matchContents style={styles.host}>
        <SwiftUIButton
          label={title}
          systemImage={systemImage}
          onPress={onPress}
          modifiers={[
            buttonStyle('borderedProminent'),
            controlSize('regular'),
            tint(resolvedTint),
            disabledModifier(!!disabled),
          ]}
        />
      </Host>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      disabled={disabled}
      style={[styles.fallback, { backgroundColor: resolvedTint, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={styles.fallbackRow}>
        {fallbackIcon && <Ionicons name={fallbackIcon} size={16} color="#FFFFFF" />}
        <Text style={styles.fallbackLabel}>{title}</Text>
      </View>
    </Pressable>
  );
}

interface NativeIconButtonProps {
  /** An SF Symbols name, e.g. "plus". */
  systemImage: SFSymbol;
  /** Fallback icon for Android/web, from Ionicons. */
  fallbackIcon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  /** Defaults to the theme's blue accent. */
  tint?: string;
}

/** A small circular, accent-filled icon button (e.g. the dashboard "add wallet" button). */
export function NativeIconButton({
  systemImage,
  fallbackIcon,
  onPress,
  accessibilityLabel,
  size = 32,
  tint: tintColor,
}: NativeIconButtonProps) {
  const colors = useThemeColors();
  const resolvedTint = tintColor ?? colors.blue;

  if (Platform.OS === 'ios') {
    return (
      <Host matchContents style={styles.host}>
        <SwiftUIButton
          label={accessibilityLabel}
          systemImage={systemImage}
          onPress={onPress}
          modifiers={[
            buttonStyle('borderedProminent'),
            buttonBorderShape('circle'),
            labelStyle('iconOnly'),
            tint(resolvedTint),
            frame({ width: size, height: size }),
          ]}
        />
      </Host>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.iconFallback,
        { backgroundColor: resolvedTint, width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Ionicons name={fallbackIcon} size={20} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'flex-start' },
  fallback: {
    borderRadius: radii.control,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fallbackLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  iconFallback: { alignItems: 'center', justifyContent: 'center' },
});
