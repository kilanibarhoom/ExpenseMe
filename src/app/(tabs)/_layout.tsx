import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

/**
 * Real native tab bar (UITabBarController on iOS / BottomNavigationView on
 * Android) — gets automatic Liquid Glass on iOS 26 with no custom glass code.
 * Tap-only; native tab bars don't support swipe.
 *
 * The floating "add" button lives in the root layout (see `_layout.tsx`),
 * not here — positioning it as a sibling of `NativeTabs` doesn't get normal
 * flex/safe-area behavior since NativeTabs is a native-hosted view, not a
 * plain RN View.
 */
export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'wallet.pass', selected: 'wallet.pass.fill' }} md="account_balance_wallet" />
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reports">
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.pie', selected: 'chart.pie.fill' }} md="pie_chart" />
        <NativeTabs.Trigger.Label>{t('tabs.reports')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="debts">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="people" />
        <NativeTabs.Trigger.Label>{t('tabs.debts')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
        <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
