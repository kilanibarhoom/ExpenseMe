import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceChips, FieldLabel, TextField } from '@/components/form';
import { NativeButton } from '@/components/NativeButton';
import { createDebt } from '@/features/debts/queries';
import { CURRENCIES, toMinor, type Currency } from '@/lib/money';
import { radii, spacing, useThemeColors } from '@/lib/theme';

export default function NewDebtScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [direction, setDirection] = useState<'i_owe' | 'owed_to_me'>('i_owe');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('ILS');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [nameError, setNameError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    let valid = true;
    if (personName.trim() === '') {
      setNameError(t('debts.personName'));
      valid = false;
    }
    let principalMinor = 0;
    try {
      principalMinor = toMinor(amount, currency);
      if (principalMinor <= 0) throw new Error('zero');
      setAmountError(undefined);
    } catch {
      setAmountError(t('quickAdd.errPositive'));
      valid = false;
    }
    if (!valid || saving) return;
    setSaving(true);
    await createDebt({ direction, personName, currency, principalMinor, occurredAt });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.l, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => router.back()}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{t('debts.newTitle')}</Text>
        </View>

        <ChoiceChips
          label={t('debts.direction')}
          value={direction}
          onChange={setDirection}
          colorFor={(v) => (v === 'i_owe' ? colors.red : colors.green)}
          options={[
            { value: 'i_owe', label: t('debts.moneyIOwe') },
            { value: 'owed_to_me', label: t('debts.moneyImOwed') },
          ]}
        />
        <TextField
          label={t('debts.personName')}
          value={personName}
          onChangeText={(v) => {
            setPersonName(v);
            if (v.trim() !== '') setNameError(undefined);
          }}
          placeholder={t('debts.personPlaceholder')}
          error={nameError}
          autoFocus
        />
        <ChoiceChips
          label={t('account.currency')}
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({ value: c, label: t(`currency.${c}`) }))}
        />
        <TextField
          label={`${t('common.amount')} (${currency})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={amountError}
        />
        <View style={styles.field}>
          <FieldLabel>{t('common.date')}</FieldLabel>
          <View style={[styles.dateRow, { backgroundColor: colors.card }]}>
            <DateTimePicker
              value={occurredAt}
              mode="date"
              onChange={(_event, date) => {
                if (date) setOccurredAt(date);
              }}
            />
          </View>
        </View>
        <NativeButton title={t('common.save')} onPress={save} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.l },
  title: { fontSize: 28, fontWeight: '800' },
  field: { gap: 6, marginBottom: spacing.l },
  dateRow: { borderRadius: radii.control, padding: spacing.s, alignItems: 'flex-start' },
});
