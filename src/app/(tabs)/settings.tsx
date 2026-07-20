import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Children, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/form';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/Screen';
import { setDefaultAccount, useAccountsWithBalances } from '@/features/accounts/queries';
import { exportDataAsJson } from '@/features/export/exportJson';
import { refreshRatesNow } from '@/features/fx/refresh';
import { useFxRates } from '@/features/fx/useFxRates';
import { radii, spacing, useThemeColors } from '@/lib/theme';
import { useSettings } from '@/lib/settings-store';

function SectionTitle({ children }: { children: string }) {
  const colors = useThemeColors();
  return <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{children}</Text>;
}

/** iOS-style grouped list card: one rounded container, hairline dividers between rows. */
function SettingsCard({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  const items = Children.toArray(children);
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {items.map((child, i) => (
        <View key={i}>
          {child}
          {i < items.length - 1 && (
            <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          )}
        </View>
      ))}
    </View>
  );
}

function SettingsRow({
  icon,
  iconColor,
  label,
  labelColor,
  sub,
  onPress,
  chevron,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  labelColor?: string;
  sub?: string;
  onPress?: () => void;
  chevron?: boolean;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={disabled}
      style={styles.rowPress}
    >
      <Ionicons name={icon} size={20} color={iconColor ?? colors.textMuted} />
      <Text style={[styles.rowLabel, { color: labelColor ?? colors.text, flex: 1 }]}>{label}</Text>
      {sub && <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sub}</Text>}
      {chevron && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </Wrapper>
  );
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
          <ChoiceChips
            value={String(fxRefreshHours)}
            onChange={(v) => void setFxRefreshHours(Number(v))}
            options={[6, 12, 24, 48].map((h) => ({
              value: String(h),
              label: t('settings.hours', { count: h }),
            }))}
          />
          <SettingsCard>
            <SettingsRow
              icon="refresh"
              iconColor={colors.blue}
              label={t('settings.refreshNow')}
              sub={
                lastFxSyncAt
                  ? t('settings.lastSync', {
                      date: new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(lastFxSyncAt),
                    })
                  : t('settings.neverSynced')
              }
              onPress={() => void manualRefresh()}
              disabled={refreshing}
            />
          </SettingsCard>
        </View>

        <SectionTitle>{t('settings.data')}</SectionTitle>
        <View style={styles.block}>
          <SettingsCard>
            <SettingsRow
              icon="download-outline"
              label={t('settings.exportJson')}
              chevron
              onPress={() => void exportDataAsJson()}
            />
            <SettingsRow
              icon="cloud-upload-outline"
              label={t('settings.backup')}
              labelColor={colors.textMuted}
              sub={t('common.comingSoon')}
            />
          </SettingsCard>
        </View>

        <SectionTitle>{t('settings.about')}</SectionTitle>
        <View style={styles.block}>
          <SettingsCard>
            <SettingsRow
              icon="information-circle-outline"
              label={t('appName')}
              sub={`${t('settings.version')} ${Constants.expoConfig?.version ?? '1.0.0'}`}
            />
          </SettingsCard>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '800', paddingHorizontal: spacing.l, marginBottom: spacing.l },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.l,
    marginBottom: spacing.xs,
  },
  block: { paddingHorizontal: spacing.l, gap: spacing.s },
  card: { borderRadius: radii.control, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.l + 20 + spacing.m },
  rowPress: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, padding: spacing.l },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 13 },
});
