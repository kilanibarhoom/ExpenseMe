import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import type { Account } from '@/db/schema';
import { formatMoney } from '@/lib/money';
import { spacing, useThemeColors } from '@/lib/theme';

export function AccountCard({ account, balanceMinor }: { account: Account; balanceMinor: number }) {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: account.color ?? colors.chip }]}>
        <Text style={styles.icon}>
          {account.icon ?? (account.type === 'cash' ? '💵' : '🏦')}
        </Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {account.name}
          </Text>
          {account.isDefault && (
            <View style={[styles.badge, { backgroundColor: colors.greenSoft }]}>
              <Text style={[styles.badgeText, { color: colors.green }]}>
                {t('account.defaultBadge')}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.currency, { color: colors.textMuted }]}>
          {t(`currency.${account.currency}`)}
        </Text>
      </View>
      <View style={styles.balanceWrap}>
        <Text style={[styles.balance, { color: colors.text }]}>
          {formatMoney(balanceMinor, account.currency, i18n.language)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  name: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  currency: { fontSize: 12 },
  balanceWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balance: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chevron: { transform: [{ scaleX: 1 }] },
});
