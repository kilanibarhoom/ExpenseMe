import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { GlassTabBar } from '@/components/glass/GlassTabBar';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="reports" options={{ title: t('tabs.reports') }} />
      <Tabs.Screen name="debts" options={{ title: t('tabs.debts') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
    </Tabs>
  );
}
