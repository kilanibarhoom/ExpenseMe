import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AccountCard } from '@/components/AccountCard';
import { ActivityRow } from '@/components/ActivityRow';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { MonthPills, useMonthRanges } from '@/components/MonthPills';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/Screen';
import { combinedIlsMinor } from '@/features/accounts/logic';
import { useAccountsWithBalances } from '@/features/accounts/queries';
import { useFxRates } from '@/features/fx/useFxRates';
import { useActivity } from '@/features/transactions/queries';
import { formatMoney } from '@/lib/money';
import { spacing, useThemeColors } from '@/lib/theme';

export default function HomeScreen() {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data: accountsData, loaded } = useAccountsWithBalances();
  const { rates, fetchedAt } = useFxRates();
  const ranges = useMonthRanges();
  const [rangeKey, setRangeKey] = useState('this');
  const range = ranges.find((r) => r.key === rangeKey) ?? ranges[0];
  const { items } = useActivity({
    from: range.start ?? undefined,
    to: range.end ?? undefined,
    limit: 10,
  });

  if (loaded && accountsData.length === 0) {
    return <Redirect href="/onboarding" />;
  }

  const totalIls = combinedIlsMinor(
    accountsData.map(({ account, balanceMinor }) => ({ balanceMinor, currency: account.currency })),
    rates,
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}>
        <Text style={[styles.title, { color: colors.text }]}>{t('home.title')}</Text>

        <Card style={styles.totalCard}>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
            {t('home.combinedBalance')}
          </Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {formatMoney(totalIls, 'ILS', i18n.language)}
          </Text>
          <Text style={[styles.ratesNote, { color: colors.textMuted }]}>
            {fetchedAt
              ? t('home.ratesAsOf', {
                  date: new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(fetchedAt),
                })
              : t('home.ratesNever')}
          </Text>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.title')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.addAccount')}
            onPress={() => router.push('/account/new')}
            style={[styles.addButton, { backgroundColor: colors.chip }]}
          >
            <Ionicons name="add" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.accountsList}>
          {accountsData.map(({ account, balanceMinor }) => (
            <Pressable
              key={account.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/account/[id]', params: { id: account.id } })}
            >
              <AccountCard account={account} balanceMinor={balanceMinor} />
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>
          {t('home.recentActivity')}
        </Text>
        <View style={{ marginTop: spacing.s, marginBottom: spacing.m }}>
          <MonthPills ranges={ranges} selectedKey={rangeKey} onSelect={(r) => setRangeKey(r.key)} />
        </View>
        {items.length === 0 ? (
          <EmptyState
            emoji="🍃"
            title={t('home.emptyActivityTitle')}
            body={t('home.emptyActivityBody')}
          />
        ) : (
          <Card style={styles.activityCard}>
            {items.map((item) => (
              <ActivityRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '800', paddingHorizontal: spacing.l, marginBottom: spacing.l },
  totalCard: { marginHorizontal: spacing.l, gap: 4 },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  ratesNote: { fontSize: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    marginTop: spacing.xl,
    marginBottom: spacing.m,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', paddingHorizontal: spacing.l },
  addButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  accountsList: { paddingHorizontal: spacing.l, gap: spacing.m },
  activityCard: { marginHorizontal: spacing.l, paddingVertical: spacing.xs },
});
