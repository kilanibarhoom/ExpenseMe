import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AccountCard } from "@/components/AccountCard";
import { ActivityRow } from "@/components/ActivityRow";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ExchangeRateBanner } from "@/components/ExchangeRateBanner";
import { MonthPills, useMonthRanges } from "@/components/MonthPills";
import { NativeButton, NativeIconButton } from "@/components/NativeButton";
import { Screen, TAB_BAR_CLEARANCE } from "@/components/Screen";
import { combinedIlsMinor } from "@/features/accounts/logic";
import { useAccountsWithBalances } from "@/features/accounts/queries";
import { useFxRates } from "@/features/fx/useFxRates";
import { useActivity } from "@/features/transactions/queries";
import { formatMoney } from "@/lib/money";
import { spacing, useThemeColors } from "@/lib/theme";

const WALLET_PREVIEW_COUNT = 3;

export default function HomeScreen() {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data: accountsData, loaded } = useAccountsWithBalances();
  const { rates, fetchedAt } = useFxRates();
  const [walletsExpanded, setWalletsExpanded] = useState(false);
  const ranges = useMonthRanges();
  const [rangeKey, setRangeKey] = useState("this");
  const range = ranges.find((r) => r.key === rangeKey) ?? ranges[0];
  const { items } = useActivity({
    from: range.start ?? undefined,
    to: range.end ?? undefined,
    limit: 10,
  });

  if (loaded && accountsData.length === 0) {
    return <Redirect href="/onboarding" />;
  }

  const totalIls = combinedIlsMinor(
    accountsData.map(({ account, balanceMinor }) => ({
      balanceMinor,
      currency: account.currency,
    })),
    rates,
  );

  const hiddenWalletCount = accountsData.length - WALLET_PREVIEW_COUNT;
  const visibleAccounts =
    walletsExpanded || hiddenWalletCount <= 0
      ? accountsData
      : accountsData.slice(0, WALLET_PREVIEW_COUNT);

  const toggleWalletsExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWalletsExpanded((v) => !v);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("home.title")}
          </Text>
          <NativeButton
            title={t("home.add")}
            systemImage="plus"
            fallbackIcon="add"
            onPress={() => router.push("/quick-add")}
          />
        </View>

        <ExchangeRateBanner />

        <Card style={styles.totalCard}>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
            {t("home.combinedBalance")}
          </Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {formatMoney(totalIls, "ILS", i18n.language)}
          </Text>
          <Text style={[styles.ratesNote, { color: colors.textMuted }]}>
            {fetchedAt
              ? t("home.ratesAsOf", {
                  date: new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(fetchedAt),
                })
              : t("home.ratesNever")}
          </Text>
        </Card>

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, paddingHorizontal: 0 },
            ]}
          >
            {t("home.title")}
          </Text>
          <NativeIconButton
            systemImage="plus"
            fallbackIcon="add"
            accessibilityLabel={t("home.addAccount")}
            onPress={() => router.push("/account/new")}
          />
        </View>
        <View style={styles.accountsList}>
          {visibleAccounts.map(({ account, balanceMinor }) => (
            <Pressable
              key={account.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/account/[id]",
                  params: { id: account.id },
                })
              }
            >
              <AccountCard
                account={account}
                balanceMinor={balanceMinor}
                rates={rates}
              />
            </Pressable>
          ))}
          {hiddenWalletCount > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={toggleWalletsExpanded}
              style={styles.showMoreButton}
            >
              <Text style={[styles.showMoreLabel, { color: colors.blue }]}>
                {walletsExpanded
                  ? t("home.showLess")
                  : t("home.showMore", { count: hiddenWalletCount })}
              </Text>
            </Pressable>
          )}
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, marginTop: spacing.xl },
          ]}
        >
          {t("home.recentActivity")}
        </Text>
        <View style={{ marginTop: spacing.s, marginBottom: spacing.m }}>
          <MonthPills
            ranges={ranges}
            selectedKey={rangeKey}
            onSelect={(r) => setRangeKey(r.key)}
          />
        </View>
        {items.length === 0 ? (
          <EmptyState
            emoji="🍃"
            title={t("home.emptyActivityTitle")}
            body={t("home.emptyActivityBody")}
          />
        ) : (
          <Card style={styles.activityCard}>
            {items.map((item) => (
              <ActivityRow
                key={`${item.kind}-${item.id}`}
                item={item}
                onPress={() =>
                  router.push({
                    pathname: "/quick-add",
                    params: { id: item.id, kind: item.kind },
                  })
                }
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.l,
    marginBottom: spacing.l,
  },
  title: { fontSize: 34, fontWeight: "800" },
  totalCard: { marginHorizontal: spacing.l, gap: 4 },
  totalLabel: { fontSize: 13, fontWeight: "600" },
  totalValue: {
    fontSize: 34,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  ratesNote: { fontSize: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.l,
    marginTop: spacing.xl,
    marginBottom: spacing.m,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: spacing.l,
  },
  accountsList: { paddingHorizontal: spacing.l, gap: spacing.m },
  showMoreButton: { alignItems: "center", paddingVertical: spacing.s },
  showMoreLabel: { fontSize: 14, fontWeight: "700" },
  activityCard: { marginHorizontal: spacing.l, paddingVertical: spacing.xs },
});
