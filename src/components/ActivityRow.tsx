import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ActivityItem } from '@/features/transactions/queries';
import { formatMoney } from '@/lib/money';
import { spacing, useThemeColors } from '@/lib/theme';

function formatDay(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

/**
 * One row of the activity feed. Transfers render neutrally (spec rule 4 —
 * they are movements, not income/expense); `perspectiveAccountId` decides
 * which side/sign a transfer shows in an account's own history.
 */
export function ActivityRow({
  item,
  perspectiveAccountId,
  onPress,
}: {
  item: ActivityItem;
  perspectiveAccountId?: string;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const Container = ({ children }: { children: ReactNode }) =>
    onPress ? (
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
        {children}
      </Pressable>
    ) : (
      <View style={styles.row}>{children}</View>
    );

  if (item.kind === 'tx') {
    const isExpense = item.type === 'expense';
    const label = (locale === 'ar' ? item.categoryLabelAr : item.categoryLabelEn) ?? '';
    return (
      <Container>
        <View style={[styles.iconWrap, { backgroundColor: (item.categoryColor ?? colors.chip) + '22' }]}>
          <Text style={styles.icon}>{item.categoryIcon ?? '💸'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.note?.trim() ? item.note : label}
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
            {label} · {formatDay(item.occurredAt, locale)}
          </Text>
        </View>
        <Text style={[styles.amount, { color: isExpense ? colors.red : colors.green }]}>
          {isExpense ? '−' : '+'}
          {formatMoney(item.amountMinor, item.currency, locale)}
        </Text>
      </Container>
    );
  }

  const outgoing = perspectiveAccountId !== undefined && item.fromAccountId === perspectiveAccountId;
  const incoming = perspectiveAccountId !== undefined && item.toAccountId === perspectiveAccountId;
  const amountText = outgoing
    ? `−${formatMoney(item.fromAmountMinor, item.fromCurrency, locale)}`
    : incoming
      ? `+${formatMoney(item.toAmountMinor, item.toCurrency, locale)}`
      : `${formatMoney(item.fromAmountMinor, item.fromCurrency, locale)} → ${formatMoney(item.toAmountMinor, item.toCurrency, locale)}`;

  return (
    <Container>
      <View style={[styles.iconWrap, { backgroundColor: colors.chip }]}>
        <Text style={styles.icon}>🔁</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {item.note?.trim() ? item.note : t('home.transfer')}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {t('home.transfer')} · {formatDay(item.occurredAt, locale)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: outgoing ? colors.red : incoming ? colors.green : colors.textMuted }]}>
        {amountText}
      </Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.m },
  iconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12 },
  amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
