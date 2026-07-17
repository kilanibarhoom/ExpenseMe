import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import type { Debt } from '@/db/schema';
import { formatMoney } from '@/lib/money';
import { spacing, useThemeColors } from '@/lib/theme';

export function DebtRow({ debt }: { debt: Debt }) {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const owedToMe = debt.direction === 'owed_to_me';
  const accent = owedToMe ? colors.green : colors.red;
  return (
    <Card style={styles.card}>
      <View style={[styles.arrowWrap, { backgroundColor: owedToMe ? colors.greenSoft : colors.redSoft }]}>
        <Ionicons
          name={owedToMe ? 'arrow-up-outline' : 'arrow-down-outline'}
          size={18}
          color={accent}
          style={{ transform: [{ rotate: owedToMe ? '45deg' : '-45deg' }] }}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {debt.personName}
        </Text>
        <View style={[styles.badge, { backgroundColor: owedToMe ? colors.greenSoft : colors.redSoft }]}>
          <Text style={[styles.badgeText, { color: accent }]}>
            {owedToMe ? t('debts.owedToMe') : t('debts.owedByMe')}
          </Text>
        </View>
      </View>
      <View style={styles.amountWrap}>
        <Text style={[styles.amount, { color: accent }]}>
          {formatMoney(debt.remainingAmount, debt.currency, i18n.language)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  arrowWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  amountWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
