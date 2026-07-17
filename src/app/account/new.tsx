import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceChips, PrimaryButton, SwitchRow, TextField } from '@/components/form';
import { createAccount } from '@/features/accounts/queries';
import { CURRENCIES, toMinor, type Currency } from '@/lib/money';
import { spacing, useThemeColors } from '@/lib/theme';

export default function NewAccountScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const isFirst = first === '1';

  const [name, setName] = useState('');
  const [type, setType] = useState<'cash' | 'bank'>('cash');
  const [currency, setCurrency] = useState<Currency>('ILS');
  const [opening, setOpening] = useState('');
  const [makeDefault, setMakeDefault] = useState(isFirst);
  const [nameError, setNameError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    let valid = true;
    if (name.trim() === '') {
      setNameError(t('account.name'));
      valid = false;
    }
    let initialBalanceMinor = 0;
    if (opening.trim() !== '') {
      try {
        initialBalanceMinor = toMinor(opening, currency);
        setAmountError(undefined);
      } catch {
        setAmountError(t('quickAdd.errPositive'));
        valid = false;
      }
    }
    if (!valid || saving) return;
    setSaving(true);
    await createAccount({
      name: name.trim(),
      type,
      currency,
      initialBalanceMinor,
      makeDefault,
    });
    if (isFirst) router.replace('/(tabs)');
    else router.back();
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
      >
        <View style={styles.header}>
          {!isFirst && (
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => router.back()}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          )}
          <Text style={[styles.title, { color: colors.text }]}>
            {isFirst ? t('onboarding.firstAccountTitle') : t('account.newTitle')}
          </Text>
        </View>
        {isFirst && (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('onboarding.firstAccountBody')}
          </Text>
        )}

        <TextField
          label={t('account.name')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (v.trim() !== '') setNameError(undefined);
          }}
          placeholder={t('account.namePlaceholder')}
          error={nameError}
          autoFocus
        />
        <ChoiceChips
          label={t('account.type')}
          value={type}
          onChange={setType}
          options={[
            { value: 'cash', label: `💵 ${t('account.typeCash')}` },
            { value: 'bank', label: `🏦 ${t('account.typeBank')}` },
          ]}
        />
        <ChoiceChips
          label={t('account.currency')}
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({ value: c, label: t(`currency.${c}`) }))}
        />
        <Text style={[styles.hint, { color: colors.textMuted }]}>{t('account.currencyLocked')}</Text>
        <TextField
          label={t('account.openingBalance')}
          value={opening}
          onChangeText={setOpening}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={amountError}
        />
        {!isFirst && (
          <SwitchRow label={t('account.setDefault')} value={makeDefault} onChange={setMakeDefault} />
        )}
        <PrimaryButton title={t('common.save')} onPress={save} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.s },
  title: { fontSize: 28, fontWeight: '800', flexShrink: 1 },
  subtitle: { fontSize: 14, marginBottom: spacing.xl },
  hint: { fontSize: 12, marginTop: -spacing.m, marginBottom: spacing.l },
});
