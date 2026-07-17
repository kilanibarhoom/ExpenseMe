import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import { formatMoney, type Currency } from '@/lib/money';
import { spacing, useThemeColors } from '@/lib/theme';

function SummaryCard({
  title,
  totals,
  tone,
}: {
  title: string;
  totals: Partial<Record<Currency, number>>;
  tone: 'green' | 'red';
}) {
  const colors = useThemeColors();
  const { i18n } = useTranslation();
  const accent = tone === 'green' ? colors.green : colors.red;
  const entries = Object.entries(totals) as [Currency, number][];
  return (
    <Card style={[styles.card, { backgroundColor: tone === 'green' ? colors.greenSoft : colors.redSoft }]}>
      <View style={styles.titleRow}>
        <Ionicons
          name={tone === 'green' ? 'arrow-up-circle' : 'arrow-down-circle'}
          size={18}
          color={accent}
        />
        <Text style={[styles.title, { color: accent }]}>{title}</Text>
      </View>
      {entries.length === 0 ? (
        <Text style={[styles.amount, { color: accent }]}>—</Text>
      ) : (
        entries.map(([currency, amount]) => (
          <Text key={currency} style={[styles.amount, { color: accent }]}>
            {formatMoney(amount, currency, i18n.language)}
          </Text>
        ))
      )}
    </Card>
  );
}

/** Per-currency debt totals — deliberately never converted (spec rule 8). */
export function DebtSummaryCards({
  owedToMe,
  iOwe,
}: {
  owedToMe: Partial<Record<Currency, number>>;
  iOwe: Partial<Record<Currency, number>>;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <SummaryCard title={t('debts.youAreOwed')} totals={owedToMe} tone="green" />
      <SummaryCard title={t('debts.youOwe')} totals={iOwe} tone="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.m, paddingHorizontal: spacing.l },
  card: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  title: { fontSize: 13, fontWeight: '700' },
  amount: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
