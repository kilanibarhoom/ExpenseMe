import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '@/components/form';
import { NativeButton } from '@/components/NativeButton';
import { addDebtEntry, useDebt } from '@/features/debts/queries';
import { toMinor } from '@/lib/money';
import { spacing, useNativeSheetColors } from '@/lib/theme';

/** Native Liquid Glass pull-up sheet for recording a payment or an increase on a debt. */
export default function DebtEntryScreen() {
  const { debtId, kind } = useLocalSearchParams<{ debtId: string; kind: 'payment' | 'increase' }>();
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useNativeSheetColors();
  const insets = useSafeAreaInsets();
  const { debt } = useDebt(debtId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [amountError, setAmountError] = useState<string | undefined>();

  if (!debt) return null;

  const submit = async () => {
    try {
      const amountMinor = toMinor(amount, debt.currency);
      if (amountMinor <= 0) throw new Error('zero');
      setAmountError(undefined);
      await addDebtEntry(debt.id, kind, amountMinor, note || undefined);
      router.back();
    } catch {
      setAmountError(t('quickAdd.errPositive'));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            {kind === 'payment' ? t('debts.paymentTitle') : t('debts.increaseTitle')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        </View>
        <TextField
          label={`${t('common.amount')} (${debt.currency})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={amountError}
          autoFocus
        />
        <TextField
          label={`${t('common.note')} (${t('common.optional')})`}
          value={note}
          onChangeText={setNote}
        />
        <NativeButton title={t('common.add')} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.l,
  },
  title: { fontSize: 20, fontWeight: '800', flex: 1 },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,128,0.24)',
  },
});
