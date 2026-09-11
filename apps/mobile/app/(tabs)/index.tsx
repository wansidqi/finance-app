import { Card } from "@/components/ui/card";
import { IconAvatar } from "@/components/ui/icon-avatar";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";
import { NisabSourceBanner } from "@/components/zakat/nisab-source-banner";
import { StateNisabListModal } from "@/components/zakat/state-nisab-list-modal";
import { SCREEN_SCROLL_BOTTOM_PADDING } from "@/constants/layout";
import { useFormatRM } from "@/hooks/use-format-rm";
import { AssetCategory } from "@/interface/asset";
import { useGetAssets } from "@/services/asset";
import { useGetLiabilities } from "@/services/liability";
import {
  useDetectLocation,
  useGetAllStateNisabRates,
  useGetDetectedLocation,
} from "@/services/state-location";
import { useGetZakatCategories } from "@/services/zakat";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CATEGORY_ORDER: AssetCategory[] = ["CASH", "GOLD", "CRYPTO", "STOCK"];

export default function DashboardScreen() {
  const router = useRouter();
  const { formatRM, hideAmounts, setHideAmounts } = useFormatRM();
  const { data: assets, isLoading: assetsLoading } = useGetAssets();
  const { data: liabilities, isLoading: liabilitiesLoading } =
    useGetLiabilities();
  const { data: zakatCategories, isLoading: zakatLoading } =
    useGetZakatCategories();
  const detectLocation = useDetectLocation();
  const { data: detectedLocation } = useGetDetectedLocation();
  const { data: stateNisabRates, isLoading: isLoadingStateRates } =
    useGetAllStateNisabRates();
  const [showStateList, setShowStateList] = useState(false);

  const isLoading = assetsLoading || liabilitiesLoading || zakatLoading;

  // Totals by category, counting only assets still marked "include in
  // total" — assets held for someone else (toggled off) are excluded from
  // net worth, not just from zakat.
  const categoryTotals = useMemo(() => {
    const totals: Record<AssetCategory, number> = {
      CASH: 0,
      GOLD: 0,
      CRYPTO: 0,
      STOCK: 0,
    };
    for (const a of assets ?? []) {
      if (!a.is_calculate) continue;
      totals[a.category] = (totals[a.category] ?? 0) + (a.price ?? 0);
    }
    return totals;
  }, [assets]);

  const excludedTotal = useMemo(() => {
    return (assets ?? []).reduce(
      (sum, a) => sum + (!a.is_calculate ? (a.price ?? 0) : 0),
      0,
    );
  }, [assets]);

  const totalAssets = CATEGORY_ORDER.reduce(
    (sum, c) => sum + categoryTotals[c],
    0,
  );
  const totalLiabilities = (liabilities ?? []).reduce(
    (sum, l) => sum + (l.total_balance ?? 0),
    0,
  );
  const netWorth = totalAssets - totalLiabilities;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const avgMonthlyCommitment = (liabilities ?? []).reduce(
    (sum, l) => sum + (l.monthly_payment ?? 0),
    0,
  );

  // Categories currently holding nisab, regardless of whether their haul
  // year has completed — same "Total Zakatable" concept as the Zakat
  // Tracker screen.
  const totalZakatable = (zakatCategories ?? []).reduce(
    (sum, z) => sum + (z.nisab_reached ? z.zakat_due : 0),
    0,
  );

  // Only categories whose haul year has actually completed (DUE/OVERDUE) —
  // the amount genuinely owed right now.
  const totalZakatDue = (zakatCategories ?? []).reduce((sum, z) => {
    if (z.haul_status === "DUE" || z.haul_status === "OVERDUE") {
      return sum + z.zakat_due;
    }
    return sum;
  }, 0);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#663af3" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader
        eyebrow="Overview"
        title="My Wealth"
        right={
          <View className="flex-row items-center gap-2">
            <IconButton
              onPress={() => setHideAmounts(!hideAmounts)}
              icon={hideAmounts ? "eye-off-outline" : "eye-outline"}
              label={hideAmounts ? "Show amounts" : "Hide amounts"}
            />
            <IconButton
              onPress={() => router.push("/reminders")}
              icon="notifications-outline"
              label="Reminders"
            />
            <IconButton
              onPress={() => router.push("/backup")}
              icon="settings-outline"
              label="Settings"
            />
          </View>
        }
      />

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: SCREEN_SCROLL_BOTTOM_PADDING }}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Worth + at-a-glance stats, one hero card */}
        <Card className="mb-6" padded={false}>
          <View className="px-6 pt-7 pb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-fog">
                Net Worth
              </Text>
              <IconAvatar name="trending-up-outline" size={32} />
            </View>
            <Text className="font-display text-[36px] text-white">
              {formatRM(netWorth, { decimals: true })}
            </Text>

            <View className="h-px bg-glass-edge mt-6 mb-5" />

            <View className="flex-row justify-between mb-5">
              <HeroStat
                label="Assets"
                value={formatRM(totalAssets, { decimals: true })}
                sub={
                  excludedTotal > 0
                    ? `+${formatRM(excludedTotal, { decimals: true })} excluded`
                    : undefined
                }
              />
              <HeroStat
                label="Debt"
                value={formatRM(totalLiabilities, { decimals: true })}
                align="right"
              />
            </View>

            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="font-mono text-[10px] uppercase tracking-wide text-fog">
                  Debt Ratio
                </Text>
                <Text className="font-sans text-[11px] font-bold text-frost">
                  {debtRatio.toFixed(1)}%
                </Text>
              </View>
              <View className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <View
                  className="h-full rounded-full bg-frost"
                  style={{ width: `${Math.min(debtRatio, 100)}%` }}
                />
              </View>
            </View>

            <HeroStat
              label="Avg commitment"
              value={formatRM(avgMonthlyCommitment, { decimals: true })}
            />
          </View>
        </Card>

        {/* Quick Actions */}
        <View className="mb-6">
          <SectionEyebrow label="Quick Actions" className="mb-4" />
          <View className="flex-row flex-wrap gap-3">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionButton key={action.label} {...action} />
            ))}
          </View>
        </View>

        {/* Nisab Status */}
        <View className="mb-4">
          <SectionEyebrow label="Nisab Status" className="mb-4" />
          <Card>
            <NisabSourceBanner
              source={zakatCategories?.[0]?.nisab_source}
              detectedLocation={detectedLocation ?? null}
              onDetect={() => detectLocation.mutate()}
              isDetecting={detectLocation.isPending}
              onShowStateList={() => setShowStateList(true)}
            />

            <View className="h-px bg-glass-edge my-4" />

            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="font-sans text-[12px] text-mist">
                  Nisab Threshold
                </Text>
                <Text className="font-sans text-[15px] font-bold text-white">
                  {zakatCategories?.[0]?.nisab != null
                    ? formatRM(zakatCategories[0].nisab, { decimals: true, alwaysShow: true })
                    : "—"}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="font-sans text-[12px] text-mist">
                  Total Zakatable
                </Text>
                <Text className="font-sans text-[15px] font-bold text-frost">
                  {formatRM(totalZakatable, { decimals: true })}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="font-sans text-[12px] text-mist">
                  Total Zakat Due
                </Text>
                <Text className="font-sans text-[15px] font-bold text-white">
                  {formatRM(totalZakatDue, { decimals: true })}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/zakat-tracker")}
              activeOpacity={0.7}
              className="mt-4 pt-4 border-t border-glass-edge flex-row items-center justify-center gap-1"
            >
              <Text className="font-sans text-[12px] font-semibold text-frost">
                View Details
              </Text>
              <Ionicons name="arrow-forward-outline" size={14} color="#d1e4fa" />
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>

      <StateNisabListModal
        visible={showStateList}
        onClose={() => setShowStateList(false)}
        rates={stateNisabRates}
        isLoading={isLoadingStateRates}
      />
    </View>
  );
}

// Content components
function HeroStat({
  label,
  value,
  sub,
  align = "left",
}: {
  label: string;
  value: string;
  sub?: string;
  align?: "left" | "right";
}) {
  return (
    <View style={{ alignItems: align === "right" ? "flex-end" : "flex-start" }}>
      <Text className="font-mono text-[10px] uppercase tracking-wide text-fog">
        {label}
      </Text>
      <Text className="font-sans text-[15px] font-bold text-white mt-0.5">
        {value}
      </Text>
      {sub && (
        <Text className="font-sans text-[9px] text-fog mt-0.5">{sub}</Text>
      )}
    </View>
  );
}

type QuickAction = {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  route: Parameters<ReturnType<typeof useRouter>["push"]>[0];
};

const QUICK_ACTIONS: QuickAction[] = [
  { icon: "list-outline", label: "Transactions", route: "/(tabs)/transactions" },
  { icon: "wallet-outline", label: "Assets", route: "/(tabs)/asset" },
  { icon: "card-outline", label: "Liabilities", route: "/(tabs)/liability" },
  { icon: "moon-outline", label: "Zakat", route: "/(tabs)/zakat-tracker" },
  { icon: "receipt-outline", label: "Tax Relief", route: "/tax-relief" },
  { icon: "lock-closed-outline", label: "Vault", route: "/(tabs)/document-vault" },
];

function QuickActionButton({ icon, label, route }: QuickAction) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(route)}
      activeOpacity={0.7}
      // 3 columns with gap-3 (12px) between them — 31% leaves room for two
      // gaps per row without wrapping to 2 columns.
      className="basis-[31%] items-center gap-2 rounded-card border border-glass-edge bg-glass-surface py-3.5"
    >
      <Ionicons name={icon} size={18} color="#d1e4fa" />
      <Text
        className="font-sans text-[10px] font-semibold text-mist text-center"
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
