import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FieldLabel, PrimaryButton, TextField } from '@/components/form';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useAccountsWithBalances } from '@/features/accounts/queries';
import { useFxRates } from '@/features/fx/useFxRates';
import {
  addTransaction,
  addTransfer,
  deleteTransaction,
  deleteTransfer,
  updateTransaction,
  updateTransfer,
} from '@/features/transactions/mutations';
import {
  useCategories,
  useTransactionForEdit,
  useTransferForEdit,
} from '@/features/transactions/queries';
import type { LocalAccount as Account } from '@/db/local-schema';
import { convertMinor, fromMinor, toMinor } from '@/lib/money';
import { radii, spacing, useThemeColors } from '@/lib/theme';
import { useSettings } from '@/lib/settings-store';

type Mode = 'expense' | 'income' | 'transfer';

function AccountChips({
  label,
  accounts,
  selectedId,
  onSelect,
  excludeId,
}: {
  label: string;
  accounts: Account[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  excludeId?: string | null;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {accounts
          .filter((a) => a.id !== excludeId)
          .map((account) => {
            const active = account.id === selectedId;
            return (
              <Pressable
                key={account.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(account.id)}
                style={[styles.chip, { backgroundColor: active ? colors.chipActive : colors.chip }]}
              >
                <Text style={[styles.chipText, { color: active ? colors.chipActiveText : colors.text }]}>
                  {account.icon ?? (account.type === 'cash' ? '💵' : '🏦')} {account.name} · {account.currency}
                </Text>
              </Pressable>
            );
          })}
      </ScrollView>
    </View>
  );
}

export default function QuickAddScreen() {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rates } = useFxRates();
  const defaultAccountId = useSettings((s) => s.defaultAccountId);
  const { data: accountData } = useAccountsWithBalances();
  const accounts = accountData.map((a) => a.account);

  const params = useLocalSearchParams<{ id?: string; kind?: 'tx' | 'transfer' }>();
  const editId = params.id;
  const isEdit = !!editId;
  const editTx = useTransactionForEdit(params.kind === 'tx' ? editId : undefined);
  const editTransfer = useTransferForEdit(params.kind === 'transfer' ? editId : undefined);

  const [mode, setMode] = useState<Mode>('expense');
  const categories = useCategories(mode === 'transfer' ? undefined : mode);

  const [accountId, setAccountId] = useState<string | null>(defaultAccountId);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [toAmountTouched, setToAmountTouched] = useState(false);
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Prefill the form once when editing an existing record.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    if (params.kind === 'tx' && editTx) {
      prefilled.current = true;
      setMode(editTx.type);
      setAccountId(editTx.accountId);
      setCategoryId(editTx.categoryId);
      setAmount(String(fromMinor(editTx.amount, editTx.currency)));
      setNote(editTx.note ?? '');
      setOccurredAt(editTx.occurredAt);
    } else if (params.kind === 'transfer' && editTransfer) {
      prefilled.current = true;
      setMode('transfer');
      setAccountId(editTransfer.fromAccountId);
      setToAccountId(editTransfer.toAccountId);
      setAmount(String(fromMinor(editTransfer.fromAmount, editTransfer.fromCurrency)));
      setToAmount(String(fromMinor(editTransfer.toAmount, editTransfer.toCurrency)));
      setToAmountTouched(true);
      setNote(editTransfer.note ?? '');
      setOccurredAt(editTransfer.occurredAt);
    }
  }, [params.kind, editTx, editTransfer]);

  const confirmDelete = () => {
    if (!editId) return;
    const isTransfer = params.kind === 'transfer';
    Alert.alert(
      isTransfer ? t('quickAdd.deleteTransferTitle') : t('quickAdd.deleteTransactionTitle'),
      t('quickAdd.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (isTransfer) await deleteTransfer(editId);
            else await deleteTransaction(editId);
            router.back();
          },
        },
      ],
    );
  };

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const crossCurrency = mode === 'transfer' && account && toAccount && account.currency !== toAccount.currency;

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.kind === mode),
    [categories, mode],
  );

  const prefillToAmount = (fromText: string, toAcc = toAccount) => {
    if (!account || !toAcc || account.currency === toAcc.currency || toAmountTouched) return;
    try {
      const fromMinorAmount = toMinor(fromText, account.currency);
      const converted = convertMinor(fromMinorAmount, account.currency, toAcc.currency, rates);
      setToAmount(String(fromMinor(converted, toAcc.currency)));
    } catch {
      // leave the prefill untouched while the user is mid-typing
    }
  };

  const save = async () => {
    if (!account || saving) return;
    setError(null);
    try {
      if (mode === 'transfer') {
        if (!toAccount) {
          setError(t('quickAdd.errNoAccount'));
          return;
        }
        const fromAmountMinor = toMinor(amount, account.currency);
        const toAmountMinor =
          account.currency === toAccount.currency
            ? fromAmountMinor
            : toMinor(toAmount, toAccount.currency);
        setSaving(true);
        const transferInput = {
          fromAccountId: account.id,
          toAccountId: toAccount.id,
          fromCurrency: account.currency,
          toCurrency: toAccount.currency,
          fromAmountMinor,
          toAmountMinor,
          occurredAt,
          note: note || undefined,
        };
        if (isEdit && editId) await updateTransfer(editId, transferInput);
        else await addTransfer(transferInput);
      } else {
        if (!categoryId) {
          setError(t('quickAdd.errNoCategory'));
          return;
        }
        const amountMinor = toMinor(amount, account.currency);
        setSaving(true);
        const txInput = {
          accountId: account.id,
          type: mode,
          categoryId,
          amountMinor,
          occurredAt,
          note: note || undefined,
          currency: account.currency,
        };
        if (isEdit && editId) await updateTransaction(editId, txInput, rates);
        else await addTransaction(txInput, rates);
      }
      router.back();
    } catch (e) {
      setSaving(false);
      const message = e instanceof Error ? e.message : String(e);
      if (message === 'same-account' || message.includes('same-account')) {
        setError(t('quickAdd.errSameAccount'));
      } else {
        setError(t('quickAdd.errPositive'));
      }
    }
  };

  if (accounts.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 100 }}>
          {t('home.emptyAccountsBody')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEdit ? t('quickAdd.editTitle') : t('quickAdd.title')}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => router.back()}>
            <Text style={[styles.cancel, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
          </Pressable>
        </View>

        {!isEdit && (
          <SegmentedControl<Mode>
            value={mode}
            onChange={(m) => {
              setMode(m);
              setCategoryId(null);
              setError(null);
            }}
            options={[
              { value: 'expense', label: t('quickAdd.expense'), tint: colors.red },
              { value: 'income', label: t('quickAdd.income'), tint: colors.green },
              { value: 'transfer', label: t('quickAdd.transfer'), tint: colors.blue },
            ]}
          />
        )}

        <View style={{ height: spacing.xl }} />

        {mode !== 'transfer' ? (
          <>
            <AccountChips
              label={t('quickAdd.account')}
              accounts={accounts}
              selectedId={account?.id ?? null}
              onSelect={setAccountId}
            />
            <View style={styles.field}>
              <FieldLabel>{t('quickAdd.category')}</FieldLabel>
              <View style={styles.categoryGrid}>
                {visibleCategories.map((category) => {
                  const active = category.id === categoryId;
                  const activeTextColor = category.color ? '#FFFFFF' : colors.chipActiveText;
                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setCategoryId(category.id)}
                      style={[
                        styles.categoryCell,
                        {
                          backgroundColor: active ? (category.color ?? colors.chipActive) : colors.card,
                        },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>{category.icon}</Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.categoryLabel, { color: active ? activeTextColor : colors.text }]}
                      >
                        {i18n.language === 'ar' ? category.labelAr : category.labelEn}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <TextField
              label={`${t('common.amount')} (${account?.currency ?? ''})`}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </>
        ) : (
          <>
            <AccountChips
              label={t('quickAdd.fromAccount')}
              accounts={accounts}
              selectedId={account?.id ?? null}
              onSelect={(id) => {
                setAccountId(id);
                setToAmountTouched(false);
              }}
            />
            <AccountChips
              label={t('quickAdd.toAccount')}
              accounts={accounts}
              selectedId={toAccountId}
              onSelect={(id) => {
                setToAccountId(id);
                setToAmountTouched(false);
                const target = accounts.find((a) => a.id === id);
                if (target) prefillToAmount(amount, target);
              }}
              excludeId={account?.id}
            />
            <TextField
              label={`${t('quickAdd.fromAmount')} (${account?.currency ?? ''})`}
              value={amount}
              onChangeText={(v) => {
                setAmount(v);
                prefillToAmount(v);
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            {crossCurrency && (
              <>
                <TextField
                  label={`${t('quickAdd.toAmount')} (${toAccount?.currency ?? ''})`}
                  value={toAmount}
                  onChangeText={(v) => {
                    setToAmountTouched(true);
                    setToAmount(v);
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
                <Text style={[styles.hint, { color: colors.textMuted }]}>{t('quickAdd.rateHint')}</Text>
              </>
            )}
          </>
        )}

        <View style={styles.field}>
          <FieldLabel>{t('common.date')}</FieldLabel>
          <View style={[styles.dateRow, { backgroundColor: colors.card }]}>
            <DateTimePicker
              value={occurredAt}
              mode="datetime"
              onChange={(_event, date) => {
                if (date) setOccurredAt(date);
              }}
            />
          </View>
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('common.note')}</FieldLabel>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('quickAdd.notePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[styles.noteInput, { backgroundColor: colors.card, color: colors.text }]}
          />
        </View>

        {error && (
          <Text style={[styles.error, { color: colors.red }]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <PrimaryButton title={t('common.save')} onPress={save} disabled={saving} />
        {isEdit && (
          <Pressable
            accessibilityRole="button"
            onPress={confirmDelete}
            disabled={saving}
            style={styles.deleteButton}
          >
            <Text style={[styles.deleteLabel, { color: colors.red }]}>
              {params.kind === 'transfer'
                ? t('quickAdd.deleteTransfer')
                : t('quickAdd.deleteTransaction')}
            </Text>
          </Pressable>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.l,
  },
  title: { fontSize: 24, fontWeight: '800' },
  cancel: { fontSize: 15, fontWeight: '600' },
  field: { gap: 6, marginBottom: spacing.l },
  chipsRow: { gap: spacing.s },
  chip: { borderRadius: radii.pill, paddingHorizontal: spacing.l, paddingVertical: 10 },
  chipText: { fontSize: 14, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  categoryCell: {
    width: '31%',
    borderRadius: radii.control,
    paddingVertical: spacing.m,
    alignItems: 'center',
    gap: 4,
  },
  categoryEmoji: { fontSize: 26 },
  categoryLabel: { fontSize: 12, fontWeight: '600' },
  dateRow: { borderRadius: radii.control, padding: spacing.s, alignItems: 'flex-start' },
  noteInput: {
    borderRadius: radii.control,
    paddingHorizontal: spacing.l,
    paddingVertical: 14,
    fontSize: 16,
  },
  hint: { fontSize: 12, marginTop: -spacing.m, marginBottom: spacing.l },
  error: { fontSize: 14, fontWeight: '600', marginBottom: spacing.m, textAlign: 'center' },
  deleteButton: { alignItems: 'center', paddingVertical: spacing.l, marginTop: spacing.s },
  deleteLabel: { fontSize: 15, fontWeight: '700' },
});
