import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ActivityRow } from '@/components/ActivityRow';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ChoiceChips } from '@/components/form';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/Screen';
import {
  archiveAccount,
  setDefaultAccount,
  updateAccount,
  useAccountsWithBalances,
} from '@/features/accounts/queries';
import { useActivity, useCategories } from '@/features/transactions/queries';
import { formatMoney } from '@/lib/money';
import { radii, spacing, useThemeColors } from '@/lib/theme';
import { useDebounced } from '@/lib/useDebounced';

type TypeFilter = 'all' | 'expense' | 'income';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data } = useAccountsWithBalances();
  const entry = data.find((a) => a.account.id === id);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const categories = useCategories(typeFilter === 'all' ? undefined : typeFilter);
  const { items } = useActivity({
    accountId: id,
    search: debouncedSearch,
    type: typeFilter === 'all' ? undefined : typeFilter,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
  });

  if (!entry) return <Screen />;
  const { account, balanceMinor } = entry;

  const rename = () => {
    Alert.prompt?.(
      t('account.editTitle'),
      undefined,
      (name) => {
        if (name?.trim()) void updateAccount(account.id, { name: name.trim() });
      },
      'plain-text',
      account.name,
    );
  };

  const archive = () => {
    Alert.alert(t('account.archiveConfirmTitle'), t('account.archiveConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.archive'),
        style: 'destructive',
        onPress: async () => {
          const result = await archiveAccount(account.id);
          if (result === 'blocked') {
            Alert.alert(t('account.archiveBlockedTitle'), t('account.archiveBlockedBody'));
          } else {
            router.back();
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {account.name}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.edit')} onPress={rename}>
          <Ionicons name="pencil" size={20} color={colors.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('account.archive')} onPress={archive}>
          <Ionicons name="archive-outline" size={20} color={colors.red} />
        </Pressable>
      </View>

      <FlashList
        data={items}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <ActivityRow item={item} perspectiveAccountId={account.id} />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
        ListHeaderComponent={
          <View>
            <Card style={styles.balanceCard}>
              <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
                {t('account.balance')} · {t(`currency.${account.currency}`)}
              </Text>
              <Text style={[styles.balanceValue, { color: colors.text }]}>
                {formatMoney(balanceMinor, account.currency, i18n.language)}
              </Text>
              {!account.isDefault && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void setDefaultAccount(account.id)}
                  style={[styles.defaultButton, { backgroundColor: colors.chip }]}
                >
                  <Text style={[styles.defaultButtonText, { color: colors.text }]}>
                    {t('account.setDefault')}
                  </Text>
                </Pressable>
              )}
            </Card>

            <View style={[styles.searchWrap, { backgroundColor: colors.card }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('account.searchTransactions')}
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>
            <View style={{ paddingHorizontal: spacing.l }}>
              <ChoiceChips
                value={typeFilter}
                onChange={(v) => {
                  setTypeFilter(v);
                  setCategoryFilter('all');
                }}
                options={[
                  { value: 'all', label: t('common.all') },
                  { value: 'expense', label: t('quickAdd.expense') },
                  { value: 'income', label: t('quickAdd.income') },
                ]}
              />
              <ChoiceChips
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: 'all', label: t('account.filterCategory') },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: `${category.icon} ${i18n.language === 'ar' ? category.labelAr : category.labelEn}`,
                  })),
                ]}
              />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('account.transactions')}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState emoji="🍃" title={t('home.emptyActivityTitle')} body={t('home.emptyActivityBody')} />
        }
      />
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
  title: { fontSize: 22, fontWeight: '800', flex: 1 },
  balanceCard: { marginHorizontal: spacing.l, gap: 4, marginBottom: spacing.l },
  balanceLabel: { fontSize: 13, fontWeight: '600' },
  balanceValue: { fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  defaultButton: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.l,
    paddingVertical: 8,
    marginTop: spacing.s,
  },
  defaultButtonText: { fontSize: 13, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginHorizontal: spacing.l,
    borderRadius: radii.control,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.m,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: spacing.l, marginBottom: spacing.xs },
  rowWrap: { paddingHorizontal: spacing.xl },
});
