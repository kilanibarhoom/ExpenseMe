import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DebtRow } from '@/components/DebtRow';
import { DebtSummaryCards } from '@/components/DebtSummaryCards';
import { EmptyState } from '@/components/EmptyState';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { perCurrencyTotals } from '@/features/debts/logic';
import { useDebts } from '@/features/debts/queries';
import { radii, spacing, useThemeColors } from '@/lib/theme';

export default function DebtsScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'completed'>('active');
  const { debts, allActive } = useDebts({ search, status });
  const totals = perCurrencyTotals(allActive);

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>{t('debts.title')}</Text>

      <View style={[styles.searchWrap, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('debts.searchPeople')}
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      <FlashList
        data={debts}
        keyExtractor={(debt) => debt.id}
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            style={styles.rowWrap}
            onPress={() => router.push({ pathname: '/debt/[id]', params: { id: item.id } })}
          >
            <DebtRow debt={item} />
          </Pressable>
        )}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <DebtSummaryCards owedToMe={totals.owed_to_me} iOwe={totals.i_owe} />
            <View style={{ paddingHorizontal: spacing.l, marginTop: spacing.l }}>
              <SegmentedControl
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'active', label: t('debts.active') },
                  { value: 'completed', label: t('debts.completed') },
                ]}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          status === 'active' ? (
            <EmptyState emoji="🤝" title={t('debts.emptyActiveTitle')} body={t('debts.emptyActiveBody')} />
          ) : (
            <EmptyState emoji="🎉" title={t('debts.emptyCompletedTitle')} body={t('debts.emptyCompletedBody')} />
          )
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.add')}
        onPress={() => router.push('/debt/new')}
        style={[styles.fab, { backgroundColor: colors.blue }]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '800', paddingHorizontal: spacing.l, marginBottom: spacing.m },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginHorizontal: spacing.l,
    borderRadius: radii.control,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.l,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  headerBlock: { marginBottom: spacing.m },
  rowWrap: { paddingHorizontal: spacing.l, paddingTop: spacing.m },
  fab: {
    position: 'absolute',
    bottom: TAB_BAR_CLEARANCE,
    right: spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
