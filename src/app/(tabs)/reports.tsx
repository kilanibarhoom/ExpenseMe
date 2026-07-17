import DateTimePicker from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import { CategoryPie } from '@/components/charts/CategoryPie';
import { TrendBars } from '@/components/charts/TrendBars';
import { EmptyState } from '@/components/EmptyState';
import { ChoiceChips } from '@/components/form';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/Screen';
import { combinedIlsMinor } from '@/features/accounts/logic';
import { useAccountsWithBalances } from '@/features/accounts/queries';
import { useFxRates } from '@/features/fx/useFxRates';
import {
  incomeVsExpenseSeries,
  isMonthlyPeriod,
  periodRange,
  perAccountSubtotals,
  sumByCategoryIls,
  txIlsMinor,
  type PeriodKind,
  type ReportTx,
} from '@/features/reports/logic';
import { useActivity } from '@/features/transactions/queries';
import { formatMoney } from '@/lib/money';
import { spacing, useThemeColors } from '@/lib/theme';

export default function ReportsScreen() {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { rates, fetchedAt } = useFxRates();
  const { data: accountsData } = useAccountsWithBalances();

  const [periodKind, setPeriodKind] = useState<PeriodKind>('month');
  const [customStart, setCustomStart] = useState(() => new Date());
  const [customEnd, setCustomEnd] = useState(() => new Date());
  const [exactAtTime, setExactAtTime] = useState(false);

  const period = useMemo(
    () => periodRange(periodKind, new Date(), { start: customStart, end: customEnd }),
    [periodKind, customStart, customEnd],
  );

  // Transfers are excluded from all report totals (spec rule 4).
  const { items } = useActivity({ from: period.start, to: period.end, includeTransfers: false });
  const txs: ReportTx[] = useMemo(
    () =>
      items.flatMap((item) =>
        item.kind === 'tx'
          ? [
              {
                type: item.type,
                amountMinor: item.amountMinor,
                currency: item.currency,
                fxRateToIls: item.fxRateToIls,
                occurredAt: item.occurredAt,
                accountId: item.accountId,
                categoryId: item.categoryId,
                categoryLabelEn: item.categoryLabelEn,
                categoryLabelAr: item.categoryLabelAr,
                categoryColor: item.categoryColor,
                categoryIcon: item.categoryIcon,
              },
            ]
          : [],
      ),
    [items],
  );

  const totalIls = combinedIlsMinor(
    accountsData.map(({ account, balanceMinor }) => ({ balanceMinor, currency: account.currency })),
    rates,
  );
  const slices = useMemo(
    () => sumByCategoryIls(txs, rates, exactAtTime, i18n.language),
    [txs, rates, exactAtTime, i18n.language],
  );
  const series = useMemo(
    () => incomeVsExpenseSeries(txs, period, rates, exactAtTime),
    [txs, period, rates, exactAtTime],
  );
  const subtotals = perAccountSubtotals(txs);
  const incomeTotal = txs
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + txIlsMinor(tx, rates, exactAtTime), 0);
  const expenseTotal = txs
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + txIlsMinor(tx, rates, exactAtTime), 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}>
        <Text style={[styles.title, { color: colors.text }]}>{t('reports.title')}</Text>

        <Card style={styles.totalCard}>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
            {t('reports.totalBalance')}
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

        <View style={styles.periodBlock}>
          <ChoiceChips
            value={periodKind}
            onChange={setPeriodKind}
            options={(['day', 'week', 'month', 'year', 'custom'] as const).map((kind) => ({
              value: kind,
              label: t(`reports.${kind}`),
            }))}
          />
          {periodKind === 'custom' && (
            <View style={styles.customRow}>
              <View style={styles.customField}>
                <Text style={[styles.customLabel, { color: colors.textMuted }]}>
                  {t('reports.from')}
                </Text>
                <DateTimePicker
                  value={customStart}
                  mode="date"
                  onChange={(_e, date) => date && setCustomStart(date)}
                />
              </View>
              <View style={styles.customField}>
                <Text style={[styles.customLabel, { color: colors.textMuted }]}>
                  {t('reports.to')}
                </Text>
                <DateTimePicker
                  value={customEnd}
                  mode="date"
                  onChange={(_e, date) => date && setCustomEnd(date)}
                />
              </View>
            </View>
          )}
        </View>

        <Card style={styles.summaryRowCard}>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {t('reports.income')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.green }]}>
              {formatMoney(incomeTotal, 'ILS', i18n.language)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.separator }]} />
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {t('reports.expense')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.red }]}>
              {formatMoney(expenseTotal, 'ILS', i18n.language)}
            </Text>
          </View>
        </Card>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>
              {t('reports.exactAtTime')}
            </Text>
            <Text style={[styles.toggleHint, { color: colors.textMuted }]}>
              {t('reports.exactAtTimeHint')}
            </Text>
          </View>
          <Switch value={exactAtTime} onValueChange={setExactAtTime} />
        </View>

        {txs.length === 0 ? (
          <EmptyState emoji="📊" title={t('reports.emptyTitle')} body={t('reports.emptyBody')} />
        ) : (
          <>
            {slices.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('reports.byCategory')}
                </Text>
                <Card style={styles.chartCard}>
                  <CategoryPie slices={slices} />
                </Card>
              </>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('reports.incomeVsExpense')}
            </Text>
            <Card style={styles.chartCard}>
              <TrendBars buckets={series} monthly={isMonthlyPeriod(period)} />
            </Card>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('reports.perWallet')}
            </Text>
            <View style={styles.subtotalsList}>
              {subtotals.map((row) => {
                const account = accountsData.find((a) => a.account.id === row.accountId)?.account;
                if (!account) return null;
                return (
                  <Card key={row.accountId} style={styles.subtotalCard}>
                    <Text style={[styles.subtotalName, { color: colors.text }]} numberOfLines={1}>
                      {account.icon ?? (account.type === 'cash' ? '💵' : '🏦')} {account.name}
                    </Text>
                    <View style={styles.subtotalAmounts}>
                      <Text style={[styles.subtotalValue, { color: colors.green }]}>
                        +{formatMoney(row.incomeMinor, account.currency, i18n.language)}
                      </Text>
                      <Text style={[styles.subtotalValue, { color: colors.red }]}>
                        −{formatMoney(row.expenseMinor, account.currency, i18n.language)}
                      </Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          </>
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
  periodBlock: { paddingHorizontal: spacing.l, marginTop: spacing.l },
  customRow: { flexDirection: 'row', gap: spacing.l, marginBottom: spacing.m },
  customField: { gap: 4, alignItems: 'flex-start' },
  customLabel: { fontSize: 12, fontWeight: '600' },
  summaryRowCard: { marginHorizontal: spacing.l, flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1, gap: 2 },
  summaryDivider: { width: 1, height: 36, marginHorizontal: spacing.l },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    marginTop: spacing.l,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  toggleHint: { fontSize: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: spacing.l,
    marginTop: spacing.xl,
    marginBottom: spacing.m,
  },
  chartCard: { marginHorizontal: spacing.l },
  subtotalsList: { paddingHorizontal: spacing.l, gap: spacing.m },
  subtotalCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subtotalName: { fontSize: 15, fontWeight: '700', flex: 1 },
  subtotalAmounts: { alignItems: 'flex-end', gap: 2 },
  subtotalValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
