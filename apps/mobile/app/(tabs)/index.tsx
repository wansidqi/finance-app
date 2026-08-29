import { NisabSourceBanner } from "@/components/zakat/nisab-source-banner";
import { StateNisabListModal } from "@/components/zakat/state-nisab-list-modal";
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
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CATEGORY_META: Record<
  AssetCategory,
  { label: string; icon: any; color: string }
> = {
  CASH: { label: "Cash & Savings", icon: "cash-outline", color: "#34d399" },
  GOLD: { label: "Gold", icon: "diamond-outline", color: "#fbbf24" },
  CRYPTO: { label: "Crypto", icon: "logo-bitcoin", color: "#a78bfa" },
  STOCK: { label: "Stock", icon: "trending-up-outline", color: "#38bdf8" },
};
const CATEGORY_ORDER: AssetCategory[] = ["CASH", "GOLD", "CRYPTO", "STOCK"];

function formatRM(value: number) {
  return `RM${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DashboardScreen() {
  const router = useRouter();
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
    (sum, l) => sum + (l.average_monthly_payment ?? l.monthly_payment ?? 0),
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
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#34d399" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="flex-row items-start justify-between px-6 pt-16 pb-2">
        <View>
          <Text className="text-[13px] font-medium text-slate-500">
            Overview
          </Text>
          <Text className="text-[30px] font-bold text-white mt-1 tracking-tight">
            My Wealth
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/reminders")}
            className="p-2 rounded-full bg-white/5 active:opacity-70"
          >
            <Ionicons name="notifications-outline" size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/backup")}
            className="p-2 rounded-full bg-white/5 active:opacity-70"
          >
            <Ionicons name="settings-outline" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Worth + at-a-glance stats, one hero card */}
        <View className="mb-6 rounded-[28px] bg-white/[0.035] border border-white/10 px-6 pt-7 pb-6 overflow-hidden">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-[1.5px]">
              Net Worth
            </Text>
            <View className="h-8 w-8 rounded-full bg-emerald-500/15 items-center justify-center">
              <Ionicons name="trending-up" size={15} color="#34d399" />
            </View>
          </View>
          <Text className="text-[36px] font-extrabold text-white tracking-tight">
            {formatRM(netWorth)}
          </Text>

          <View className="h-px bg-white/8 mt-6 mb-5" />

          <View className="flex-row justify-between mb-4">
            <HeroStat
              label="Assets"
              value={formatRM(totalAssets)}
              sub={excludedTotal > 0 ? `+${formatRM(excludedTotal)} excluded` : undefined}
            />
            <HeroStat label="Debt" value={formatRM(totalLiabilities)} align="right" />
          </View>
          <View className="flex-row justify-between">
            <HeroStat label="Debt ratio" value={`${debtRatio.toFixed(1)}%`} />
            <HeroStat
              label="Avg commitment"
              value={formatRM(avgMonthlyCommitment)}
              align="right"
            />
          </View>
        </View>

        {/* Asset Distribution */}
        <Section title="Asset Distribution">
          <View className="rounded-3xl bg-white/[0.035] border border-white/10 p-5">
            <View className="flex-row h-2 rounded-full overflow-hidden bg-white/8">
              {CATEGORY_ORDER.map((category, index) => {
                const percent =
                  totalAssets > 0
                    ? (categoryTotals[category] / totalAssets) * 100
                    : 0;
                if (percent <= 0) return null;
                return (
                  <View
                    key={category}
                    style={{
                      width: `${percent}%`,
                      backgroundColor: CATEGORY_META[category].color,
                      marginRight:
                        index < CATEGORY_ORDER.length - 1 ? 2 : 0,
                    }}
                  />
                );
              })}
            </View>

            <View className="flex-row flex-wrap mt-5">
              {CATEGORY_ORDER.map((category) => {
                const meta = CATEGORY_META[category];
                const value = categoryTotals[category];
                const percent =
                  totalAssets > 0 ? (value / totalAssets) * 100 : 0;
                return (
                  <View
                    key={category}
                    style={{ width: "50%" }}
                    className="pr-2 mb-4"
                  >
                    <View className="flex-row items-center gap-2 mb-1">
                      <View
                        style={{ backgroundColor: meta.color }}
                        className="h-2 w-2 rounded-full"
                      />
                      <Text className="text-[11px] text-slate-400">
                        {meta.label}
                      </Text>
                    </View>
                    <Text className="text-[14px] font-bold text-white">
                      {formatRM(value)}
                    </Text>
                    <Text className="text-[10px] text-slate-500 mt-0.5">
                      {percent.toFixed(1)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Section>

        {/* Nisab Status */}
        <Section title="Nisab Status">
          <View className="rounded-3xl bg-white/[0.035] border border-white/10 p-5">
            <NisabSourceBanner
              source={zakatCategories?.[0]?.nisab_source}
              detectedLocation={detectedLocation ?? null}
              onDetect={() => detectLocation.mutate()}
              isDetecting={detectLocation.isPending}
              onShowStateList={() => setShowStateList(true)}
            />

            <View className="h-px bg-white/8 my-4" />

            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-[12px] text-slate-400">
                  Total Zakatable
                </Text>
                <Text className="text-[15px] font-bold text-emerald-400">
                  {formatRM(totalZakatable)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-[12px] text-slate-400">
                  Total Zakat Due
                </Text>
                <Text className="text-[15px] font-bold text-white">
                  {formatRM(totalZakatDue)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/zakat-tracker")}
              activeOpacity={0.7}
              className="mt-4 pt-4 border-t border-white/8 flex-row items-center justify-center gap-1"
            >
              <Text className="text-[12px] font-semibold text-emerald-400">
                View Details
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#34d399" />
            </TouchableOpacity>
          </View>
        </Section>

        {/* Quick Actions */}
        <View className="mb-4">
          <Text className="text-[13px] font-bold text-slate-300 mb-3 uppercase tracking-wide">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <QuickActionButton
              icon="list-outline"
              label="Transactions"
              tint="#38bdf8"
            />
            <QuickActionButton
              icon="wallet-outline"
              label="Assets"
              tint="#34d399"
            />
            <QuickActionButton
              icon="card-outline"
              label="Liabilities"
              tint="#fb7185"
            />
            <QuickActionButton
              icon="moon-outline"
              label="Zakat"
              tint="#fbbf24"
            />
            <QuickActionButton
              icon="receipt-outline"
              label="Tax Relief"
              tint="#a78bfa"
            />
          </View>
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

// Layout helpers
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-5">
      <Text className="text-[13px] font-bold text-slate-300 mb-3 uppercase tracking-wide">
        {title}
      </Text>
      {children}
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
      <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </Text>
      <Text className="text-[15px] font-bold text-white mt-0.5">
        {value}
      </Text>
      {sub && (
        <Text className="text-[9px] text-slate-500 mt-0.5">{sub}</Text>
      )}
    </View>
  );
}

function QuickActionButton({
  icon,
  label,
  tint,
}: {
  icon: any;
  label: string;
  tint: string;
}) {
  const router = useRouter();

  const handlePress = () => {
    if (label === "Transactions") {
      router.push("/transactions");
    } else if (label === "Assets") {
      router.push("/(tabs)/asset");
    } else if (label === "Liabilities") {
      router.push("/(tabs)/liability");
    } else if (label === "Zakat") {
      router.push("/(tabs)/zakat-tracker");
    } else if (label === "Tax Relief") {
      router.push("/tax-relief");
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={{ flexBasis: "31%" }}
      className="items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] py-3.5"
    >
      <Ionicons name={icon} size={18} color={tint} />
      <Text
        className="text-[10px] font-semibold text-slate-300 text-center"
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
