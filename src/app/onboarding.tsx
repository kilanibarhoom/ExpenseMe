import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing, useThemeColors } from '@/lib/theme';

const PAGES = [
  { emoji: '👋', title: 'onboarding.welcomeTitle', body: 'onboarding.welcomeBody' },
  { emoji: '🧭', title: 'onboarding.featuresTitle', body: 'onboarding.featuresBody' },
] as const;

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const width = Dimensions.get('window').width;

  const next = () => {
    if (page < PAGES.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    } else {
      router.replace('/account/new?first=1');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {PAGES.map((p) => (
          <View key={p.title} style={[styles.page, { width }]}>
            <Text style={styles.emoji}>{p.emoji}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{t(p.title)}</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>{t(p.body)}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.dots}>
          {PAGES.map((p, i) => (
            <View
              key={p.title}
              style={[
                styles.dot,
                { backgroundColor: i === page ? colors.text : colors.separator },
              ]}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={next}
          style={[styles.cta, { backgroundColor: colors.chipActive }]}
        >
          <Text style={[styles.ctaText, { color: colors.chipActiveText }]}>
            {t('onboarding.getStarted')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.l },
  emoji: { fontSize: 96 },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.s },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cta: { borderRadius: radii.pill, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontSize: 17, fontWeight: '700' },
});
