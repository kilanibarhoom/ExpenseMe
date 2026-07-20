import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/Screen';
import { deleteDebt, deleteDebtEntry, fullPay, useDebt } from '@/features/debts/queries';
import { formatMoney } from '@/lib/money';
import { radii, spacing, useThemeColors } from '@/lib/theme';

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { debt, entries } = useDebt(id);

  if (!debt) return <Screen />;
  const owedToMe = debt.direction === 'owed_to_me';
  const accent = owedToMe ? colors.green : colors.red;
  const locale = i18n.language;

  const confirmDelete = () => {
    Alert.alert(t('debts.deleteConfirmTitle'), t('debts.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteDebt(debt.id);
          router.back();
        },
      },
    ]);
  };

  const confirmDeleteEntry = (entryId: string) => {
    Alert.alert(t('debts.deleteEntryTitle'), t('debts.deleteEntryBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => void deleteDebtEntry(entryId, debt.id),
      },
    ]);
  };

  const confirmFullPay = () => {
    Alert.alert(
      t('debts.fullPayConfirmTitle'),
      t('debts.fullPayConfirmBody', {
        amount: formatMoney(debt.remainingAmount, debt.currency, locale),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: () => void fullPay(debt.id) },
      ],
    );
  };

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {debt.personName}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.edit')}
          onPress={() => router.push({ pathname: '/debt/edit', params: { debtId: debt.id } })}
        >
          <Ionicons name="pencil" size={20} color={colors.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.delete')} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.red} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}>
        <Card style={[styles.topCard, { backgroundColor: owedToMe ? colors.greenSoft : colors.redSoft }]}>
          <View style={[styles.topIcon, { backgroundColor: colors.card }]}>
            <Ionicons
              name={owedToMe ? 'arrow-up-outline' : 'arrow-down-outline'}
              size={22}
              color={accent}
              style={{ transform: [{ rotate: owedToMe ? '45deg' : '-45deg' }] }}
            />
          </View>
          <Text style={[styles.topLabel, { color: accent }]}>
            {owedToMe ? t('debts.youAreOwedLabel') : t('debts.youOweLabel')}
          </Text>
          <Text style={[styles.topAmount, { color: accent }]}>
            {formatMoney(debt.remainingAmount, debt.currency, locale)}
          </Text>
          <Text style={[styles.topSub, { color: colors.textMuted }]}>
            {t('debts.remaining')} · {t(`currency.${debt.currency}`)}
          </Text>
        </Card>

        {debt.status === 'active' && (
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/debt/entry', params: { debtId: debt.id, kind: 'payment' } })}
              style={[styles.action, { backgroundColor: colors.card }]}
            >
              <Ionicons name="cash-outline" size={20} color={colors.green} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t('debts.payment')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmFullPay}
              style={[styles.action, { backgroundColor: colors.card }]}
            >
              <Ionicons name="checkmark-done-outline" size={20} color={colors.blue} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t('debts.fullPay')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/debt/entry', params: { debtId: debt.id, kind: 'increase' } })}
              style={[styles.action, { backgroundColor: colors.card }]}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.red} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t('debts.increase')}</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('debts.details')}</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: colors.textMuted }]}>{t('common.date')}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {dateFmt.format(debt.createdAt)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: colors.textMuted }]}>{t('account.currency')}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {t(`currency.${debt.currency}`)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: colors.textMuted }]}>{t('debts.status')}</Text>
            <Text style={[styles.detailValue, { color: debt.status === 'active' ? colors.amber : colors.green }]}>
              {debt.status === 'active' ? t('debts.statusActive') : t('debts.statusCompleted')}
            </Text>
          </View>
        </Card>

        {entries.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('debts.entryHistory')}</Text>
            <Card style={styles.detailsCard}>
              {entries.map((entry) => (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityHint={t('debts.deleteEntryHint')}
                  onLongPress={() => confirmDeleteEntry(entry.id)}
                  style={styles.entryRow}
                >
                  <Ionicons
                    name={entry.kind === 'payment' ? 'remove-circle-outline' : 'add-circle-outline'}
                    size={20}
                    color={entry.kind === 'payment' ? colors.green : colors.red}
                  />
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryKind, { color: colors.text }]}>
                      {entry.kind === 'payment' ? t('debts.entryPayment') : t('debts.entryIncrease')}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </Text>
                    <Text style={[styles.entryDate, { color: colors.textMuted }]}>
                      {dateFmt.format(entry.occurredAt)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.entryAmount,
                      { color: entry.kind === 'payment' ? colors.green : colors.red },
                    ]}
                  >
                    {entry.kind === 'payment' ? '−' : '+'}
                    {formatMoney(entry.amount, debt.currency, locale)}
                  </Text>
                </Pressable>
              ))}
            </Card>
            <Text style={[styles.entryHint, { color: colors.textMuted }]}>
              {t('debts.deleteEntryHint')}
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    marginBottom: spacing.m,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', flex: 1 },
  topCard: { marginHorizontal: spacing.l, alignItems: 'center', gap: 6, paddingVertical: spacing.xl },
  topIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  topLabel: { fontSize: 14, fontWeight: '700' },
  topAmount: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  topSub: { fontSize: 12 },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    marginTop: spacing.l,
  },
  action: {
    flex: 1,
    borderRadius: radii.control,
    paddingVertical: spacing.m,
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: { fontSize: 13, fontWeight: '700' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: spacing.l,
    marginTop: spacing.xl,
    marginBottom: spacing.m,
  },
  detailsCard: { marginHorizontal: spacing.l, gap: spacing.m },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailKey: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  entryInfo: { flex: 1, gap: 2 },
  entryKind: { fontSize: 14, fontWeight: '600' },
  entryDate: { fontSize: 12 },
  entryAmount: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  entryHint: { fontSize: 12, paddingHorizontal: spacing.l, marginTop: spacing.s },
});
