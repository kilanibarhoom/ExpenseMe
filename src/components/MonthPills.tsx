import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radii, spacing, useThemeColors } from '@/lib/theme';

export interface MonthRange {
  key: string;
  label: string;
  start: Date | null;
  end: Date | null;
}

export function useMonthRanges(count = 6): MonthRange[] {
  const { t, i18n } = useTranslation();
  return useMemo(() => {
    const now = new Date();
    const ranges: MonthRange[] = [
      { key: 'all', label: t('common.all'), start: null, end: null },
      {
        key: 'this',
        label: new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(now),
        start: startOfMonth(now),
        end: endOfMonth(now),
      },
    ];
    for (let i = 1; i < count; i += 1) {
      const month = subMonths(now, i);
      ranges.push({
        key: `m${i}`,
        label: new Intl.DateTimeFormat(i18n.language, { month: 'short', year: '2-digit' }).format(month),
        start: startOfMonth(month),
        end: endOfMonth(month),
      });
    }
    return ranges;
  }, [t, i18n.language, count]);
}

export function MonthPills({
  ranges,
  selectedKey,
  onSelect,
}: {
  ranges: MonthRange[];
  selectedKey: string;
  onSelect: (range: MonthRange) => void;
}) {
  const colors = useThemeColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {ranges.map((range) => {
        const active = range.key === selectedKey;
        return (
          <Pressable
            key={range.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(range)}
            style={[styles.pill, { backgroundColor: active ? colors.chipActive : colors.chip }]}
          >
            <Text style={[styles.label, { color: active ? colors.chipActiveText : colors.text }]}>
              {range.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.s, paddingHorizontal: spacing.l },
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.l, paddingVertical: spacing.s },
  label: { fontSize: 13, fontWeight: '600' },
});
