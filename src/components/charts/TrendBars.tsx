import { useWindowDimensions, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';

import type { SeriesBucket } from '@/features/reports/logic';
import { fromMinor } from '@/lib/money';
import { spacing, useThemeColors } from '@/lib/theme';

/**
 * Income vs expense over time as paired bars. The green/red pair is
 * semantically anchored (spec §9) and passes CVD validation; the legend
 * keeps identity from being color-alone. Single ILS axis only.
 */
export function TrendBars({ buckets, monthly }: { buckets: SeriesBucket[]; monthly: boolean }) {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const hasData = buckets.some((b) => b.incomeIls > 0 || b.expenseIls > 0);
  if (!hasData) return null;

  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6));
  const fmt = new Intl.DateTimeFormat(i18n.language, monthly ? { month: 'short' } : { day: 'numeric' });

  const data = buckets.flatMap((bucket, i) => [
    {
      value: fromMinor(bucket.incomeIls, 'ILS'),
      frontColor: colors.green,
      spacing: 1,
      label: i % labelEvery === 0 ? fmt.format(bucket.bucketStart) : '',
      labelTextStyle: { color: colors.textMuted, fontSize: 10 },
    },
    { value: fromMinor(bucket.expenseIls, 'ILS'), frontColor: colors.red, spacing: 7 },
  ]);

  const barWidth = Math.max(3, Math.min(14, (width - 140) / (buckets.length * 2)));

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.green }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>{t('reports.income')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.red }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>{t('reports.expense')}</Text>
        </View>
      </View>
      <BarChart
        data={data}
        barWidth={barWidth}
        barBorderTopLeftRadius={3}
        barBorderTopRightRadius={3}
        spacing={1}
        initialSpacing={spacing.s}
        endSpacing={spacing.s}
        xAxisThickness={1}
        xAxisColor={colors.separator}
        yAxisThickness={0}
        yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
        noOfSections={4}
        rulesColor={colors.separator}
        rulesType="solid"
        isAnimated
        height={160}
        width={width - 120}
        disableScroll
      />
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: spacing.l, marginBottom: spacing.m },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 13, fontWeight: '600' },
});
