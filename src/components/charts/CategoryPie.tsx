import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';

import type { CategorySlice } from '@/features/reports/logic';
import { formatMoney } from '@/lib/money';
import { spacing, useThemeColors } from '@/lib/theme';

/**
 * Expense-by-category donut. Colors follow the category entity (seeded,
 * validated palette); 2px surface gaps separate slices; identity is never
 * color-alone — every slice appears in the labeled list below.
 */
export function CategoryPie({ slices }: { slices: CategorySlice[] }) {
  const colors = useThemeColors();
  const { i18n } = useTranslation();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const total = slices.reduce((sum, s) => sum + s.ilsMinor, 0);
  if (total === 0) return null;
  const focused = slices.find((s) => s.categoryId === focusedId);

  return (
    <View>
      <View style={styles.chartWrap}>
        <PieChart
          data={slices.map((slice) => ({
            value: slice.ilsMinor,
            color: slice.color,
            focused: slice.categoryId === focusedId,
            onPress: () =>
              setFocusedId((prev) => (prev === slice.categoryId ? null : slice.categoryId)),
          }))}
          donut
          radius={92}
          innerRadius={58}
          innerCircleColor={colors.card}
          strokeWidth={2}
          strokeColor={colors.card}
          focusOnPress
          centerLabelComponent={() => (
            <View style={styles.centerLabel}>
              <Text style={[styles.centerValue, { color: colors.text }]} numberOfLines={1}>
                {formatMoney(focused ? focused.ilsMinor : total, 'ILS', i18n.language)}
              </Text>
              {focused && (
                <Text style={[styles.centerCaption, { color: colors.textMuted }]} numberOfLines={1}>
                  {focused.icon} {focused.label}
                </Text>
              )}
            </View>
          )}
        />
      </View>
      <View style={styles.legend}>
        {slices.map((slice) => (
          <View key={slice.categoryId} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: slice.color }]} />
            <Text style={[styles.legendLabel, { color: colors.text }]} numberOfLines={1}>
              {slice.icon} {slice.label}
            </Text>
            <Text style={[styles.legendValue, { color: colors.textMuted }]}>
              {formatMoney(slice.ilsMinor, 'ILS', i18n.language)} ·{' '}
              {Math.round((slice.ilsMinor / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: { alignItems: 'center', paddingVertical: spacing.m },
  centerLabel: { alignItems: 'center', paddingHorizontal: spacing.s },
  centerValue: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  centerCaption: { fontSize: 11, marginTop: 2 },
  legend: { gap: spacing.s, marginTop: spacing.s },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  legendValue: { fontSize: 13, fontVariant: ['tabular-nums'] },
});
