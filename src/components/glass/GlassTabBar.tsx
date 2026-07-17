import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii } from '@/lib/theme';
import { useThemeColors } from '@/lib/theme';

import { GlassSurface } from './GlassSurface';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'wallet-outline',
  reports: 'pie-chart-outline',
  debts: 'people-outline',
  settings: 'settings-outline',
};
const ICONS_ACTIVE: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'wallet',
  reports: 'pie-chart',
  debts: 'people',
  settings: 'settings',
};

function TabButton({
  routeName,
  label,
  focused,
  onPress,
}: {
  routeName: string;
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPressIn={() => scale.set(withSpring(0.88, { damping: 15 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 15 }))}
      onPress={onPress}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabButtonInner, animatedStyle]}>
        <Ionicons
          name={focused ? (ICONS_ACTIVE[routeName] ?? 'ellipse') : (ICONS[routeName] ?? 'ellipse-outline')}
          size={24}
          color={focused ? colors.text : colors.textMuted}
        />
        <Text style={[styles.tabLabel, { color: focused ? colors.text : colors.textMuted }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function Fab() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.add')}
      onPressIn={() => scale.set(withSpring(0.9, { damping: 15 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 15 }))}
      onPress={() => router.push('/quick-add')}
      style={styles.fabWrap}
    >
      <Animated.View style={animatedStyle}>
        <View style={[styles.fab, { backgroundColor: colors.chipActive }]}>
          <Ionicons name="add" size={30} color={colors.chipActiveText} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** Floating glass pill tab bar with a prominent center quick-add FAB. */
export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const half = Math.ceil(state.routes.length / 2);

  const renderRoute = (route: (typeof state.routes)[number], index: number) => {
    const { options } = descriptors[route.key];
    const label = typeof options.title === 'string' ? options.title : route.name;
    const focused = state.index === index;
    return (
      <TabButton
        key={route.key}
        routeName={route.name}
        label={label}
        focused={focused}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
      />
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: Math.max(insets.bottom, 12) }]}>
      <GlassSurface style={styles.pill} isInteractive>
        <View style={styles.row}>
          {state.routes.slice(0, half).map((r) => renderRoute(r, state.routes.indexOf(r)))}
          <Fab />
          {state.routes.slice(half).map((r) => renderRoute(r, state.routes.indexOf(r)))}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  pill: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  tabButton: { flex: 1, alignItems: 'center' },
  tabButtonInner: { alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  fabWrap: { marginHorizontal: 6 },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
