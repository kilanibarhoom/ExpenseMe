import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { radii, spacing, useThemeColors } from '@/lib/theme';

export function FieldLabel({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  return <Text style={[styles.label, { color: colors.textMuted }]}>{children}</Text>;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  autoFocus,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  autoFocus?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.field}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        style={[
          styles.input,
          { backgroundColor: colors.card, color: colors.text, borderColor: error ? colors.red : 'transparent' },
        ]}
      />
      {error ? <Text style={[styles.error, { color: colors.red }]}>{error}</Text> : null}
    </View>
  );
}

export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  colorFor,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  colorFor?: (v: T) => string | undefined;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.field}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <View style={styles.chipsRow}>
        {options.map((opt) => {
          const active = opt.value === value;
          const activeColor = colorFor?.(opt.value) ?? colors.chipActive;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(opt.value)}
              style={[styles.chip, { backgroundColor: active ? activeColor : colors.chip }]}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.switchRow}>
      <Text style={[styles.switchLabel, { color: colors.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.primary, { backgroundColor: colors.chipActive, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={[styles.primaryText, { color: colors.chipActiveText }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, marginBottom: spacing.l },
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    borderRadius: radii.control,
    paddingHorizontal: spacing.l,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  error: { fontSize: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  chip: { borderRadius: radii.pill, paddingHorizontal: spacing.l, paddingVertical: 10 },
  chipText: { fontSize: 14, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.l,
  },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  primary: { borderRadius: radii.pill, paddingVertical: 16, alignItems: 'center' },
  primaryText: { fontSize: 17, fontWeight: '700' },
});
