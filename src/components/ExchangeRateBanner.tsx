import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useFxRates } from '@/features/fx/useFxRates';
import { convertToIlsMinor, formatMoney, minorScale } from '@/lib/money';
import { radii, spacing, useThemeColors } from '@/lib/theme';

/** Top-of-dashboard banner showing the current USD/JOD → ILS rates and their freshness. */
export function ExchangeRateBanner() {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { rates, fetchedAt } = useFxRates();

  const oneUnitMinor = (currency: 'USD' | 'JOD') => 10 ** minorScale(currency);

  return (
    <View style={[styles.banner, { backgroundColor: colors.chip }]}>
      <Text style={[styles.title, { color: colors.textMuted }]}>{t('settings.fxSection')}</Text>
      <View style={styles.ratesRow}>
        {(['USD', 'JOD'] as const).map((currency) => (
          <Text key={currency} style={[styles.rateText, { color: colors.text }]}>
            {formatMoney(oneUnitMinor(currency), currency, i18n.language)} ={' '}
            {formatMoney(convertToIlsMinor(oneUnitMinor(currency), currency, rates[currency]), 'ILS', i18n.language)}
          </Text>
        ))}
      </View>
      <Text style={[styles.freshness, { color: colors.textMuted }]}>
        {fetchedAt
          ? t('home.ratesAsOf', {
              date: new Intl.DateTimeFormat(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(fetchedAt),
            })
          : t('home.ratesNever')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.l,
    marginBottom: spacing.l,
    borderRadius: radii.control,
    padding: spacing.m,
    gap: 4,
  },
  title: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  ratesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.l },
  rateText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  freshness: { fontSize: 11 },
});
