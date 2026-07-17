import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import { ChoiceChips } from '@/components/form';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/Screen';
import { setDefaultAccount, useAccountsWithBalances } from '@/features/accounts/queries';
import { exportDataAsJson } from '@/features/export/exportJson';
import { refreshRatesNow } from '@/features/fx/refresh';
import { useFxRates } from '@/features/fx/useFxRates';
import { spacing, useThemeColors } from '@/lib/theme';
import { useSettings } from '@/lib/settings-store';

function SectionTitle({ children }: { children: string }) {
  const colors = useThemeColors();
  return <Text style={[styles.sectionTitle, { color: colors.text }]}>{children}</Text>;
}

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { data: accountsData } = useAccountsWithBalances();
  const { locale, theme, fxRefreshHours, lastFxSyncAt, defaultAccountId } = useSettings();
  const { setLocale, setTheme, setFxRefreshHours } = useSettings.getState();
  const { invalidate } = useFxRates();
  const [refreshing, setRefreshing] = useState(false);

  const changeLocale = async (next: 'en' | 'ar') => {
    if (next === locale) return;
    const needsReload = await setLocale(next);
    if (needsReload) {
      Alert.alert(t('settings.restartTitle'), t('settings.restartBody'));
    }
  };

  const manualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshRatesNow();
      invalidate();
    } catch {
      Alert.alert(t('settings.fxSection'), t('common.retry'));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}>
        <Text style={[styles.title, { color: colors.text }]}>{t('settings.title')}</Text>

        <SectionTitle>{t('settings.defaultAccount')}</SectionTitle>
        <View style={styles.block}>
          <ChoiceChips
            value={defaultAccountId ?? ''}
            onChange={(id) => void setDefaultAccount(id)}
            options={accountsData.map(({ account }) => ({
              value: account.id,
              label: `${account.icon ?? (account.type === 'cash' ? '💵' : '🏦')} ${account.name}`,
            }))}
          />
        </View>

        <SectionTitle>{t('settings.language')}</SectionTitle>
        <View style={styles.block}>
          <ChoiceChips
            value={locale}
            onChange={(v) => void changeLocale(v)}
            options={[
              { value: 'en', label: t('settings.english') },
              { value: 'ar', label: t('settings.arabic') },
            ]}
          />
        </View>

        <SectionTitle>{t('settings.theme')}</SectionTitle>
        <View style={styles.block}>
          <ChoiceChips
            value={theme}
            onChange={(v) => void setTheme(v)}
            options={[
              { value: 'system', label: t('settings.themeSystem') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
            ]}
          />
        </View>

        <SectionTitle>{t('settings.fxSection')}</SectionTitle>
        <View style={styles.block}>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t('settings.fxRefreshHours')}
          </Text>
          <ChoiceChips
            value={String(fxRefreshHours)}
            onChange={(v) => void setFxRefreshHours(Number(v))}
            options={[6, 12, 24, 48].map((h) => ({
              value: String(h),
              label: t('settings.hours', { count: h }),
            }))}
          />
          <Card style={styles.rowCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void manualRefresh()}
              style={styles.rowPress}
              disabled={refreshing}
            >
              <Ionicons name="refresh" size={20} color={colors.blue} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  {t('settings.refreshNow')}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  {lastFxSyncAt
                    ? t('settings.lastSync', {
                        date: new Intl.DateTimeFormat(i18n.language, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(lastFxSyncAt),
                      })
                    : t('settings.neverSynced')}
                </Text>
              </View>
            </Pressable>
          </Card>
        </View>

        <SectionTitle>{t('settings.data')}</SectionTitle>
        <View style={styles.block}>
          <Card style={styles.rowCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void exportDataAsJson()}
              style={styles.rowPress}
            >
              <Ionicons name="download-outline" size={20} color={colors.text} />
              <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>
                {t('settings.exportJson')}
              </Text>
            </Pressable>
          </Card>
          <Card style={styles.rowCard}>
            <View style={styles.rowPress}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.rowLabel, { color: colors.textMuted, flex: 1 }]}>
                {t('settings.backup')}
              </Text>
              <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                {t('common.comingSoon')}
              </Text>
            </View>
          </Card>
        </View>

        <SectionTitle>{t('settings.about')}</SectionTitle>
        <View style={styles.block}>
          <Card style={styles.rowCard}>
            <View style={styles.rowPress}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>
                {t('appName')}
              </Text>
              <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                {t('settings.version')} {Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '800', paddingHorizontal: spacing.l, marginBottom: spacing.l },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: spacing.l,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  block: { paddingHorizontal: spacing.l, gap: spacing.s },
  hint: { fontSize: 12, fontWeight: '600' },
  rowCard: { padding: 0 },
  rowPress: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, padding: spacing.l },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12 },
});
