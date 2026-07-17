import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, useThemeColors } from '@/lib/theme';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; tint?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={[styles.track, { backgroundColor: colors.chip }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              active && { backgroundColor: opt.tint ?? colors.card },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? (opt.tint ? '#FFFFFF' : colors.text) : colors.textMuted },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radii.control,
    padding: 3,
  },
  segment: {
    flex: 1,
    borderRadius: radii.control - 3,
    paddingVertical: 9,
    alignItems: 'center',
  },
  label: { fontSize: 14, fontWeight: '700' },
});
