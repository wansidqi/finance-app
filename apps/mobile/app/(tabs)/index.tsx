import { AssetCategory } from "@/interface/asset";
import { ZakatTrackerDto } from "@/interface/zakat";
import { useGetAssets } from "@/services/asset";
import { useGetLiabilities } from "@/services/liability";
import { useGetZakatCategories, useGetZakatSettings } from "@/services/zakat";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
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
  const { data: zakatSettings } = useGetZakatSettings();
  const combineZakat = !!zakatSettings?.combine_categories;

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

  // Zakat figures come straight from the same backend logic the Zakat
  // Tracker screen uses, keyed by category — categories with no assets
  // yet simply fall back to a zero/not-reached state below.
  const zakatByCategory = useMemo(() => {
    const map = new Map<string, ZakatTrackerDto>();
    for (const z of zakatCategories ?? []) map.set(z.category, z);
    return map;
  }, [zakatCategories]);

  const nisab = zakatCategories?.[0]?.nisab ?? 29740;

  const totalZakatPayable = (zakatCategories ?? []).reduce(
    (sum, z) => sum + (z.nisab_reached ? z.zakat_due : 0),
    0,
  );

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
        <TouchableOpacity
          onPress={() => router.push("/backup")}
          className="p-2 rounded-full bg-white/5 active:opacity-70"
        >
          <Ionicons name="settings-outline" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Worth Card */}
        <View className="mb-5 rounded-[28px] bg-linear-to-br from-emerald-400 to-emerald-600 px-6 py-7 overflow-hidden">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[11px] font-bold text-emerald-950/70 uppercase tracking-[1.5px]">
              Net Worth
            </Text>
            <View className="h-8 w-8 rounded-full bg-emerald-950/10 items-center justify-center">
              <Ionicons name="trending-up" size={15} color="#022c22" />
            </View>
          </View>
          <Text className="text-[34px] font-extrabold text-emerald-950 tracking-tight">
            {formatRM(netWorth)}
          </Text>
        </View>

        {/* Quick Stats Grid */}
        <View className="mb-5 gap-3">
          <View className="flex-row gap-3">
            <StatCard
              icon="wallet-outline"
              label="Total Assets"
              value={formatRM(totalAssets)}
              sub={excludedTotal > 0 ? `+${formatRM(excludedTotal)} excluded` : undefined}
              tint="#34d399"
            />
            <StatCard
              icon="card-outline"
              label="Total Debt"
              value={formatRM(totalLiabilities)}
              tint="#fb7185"
            />
          </View>
          <View className="flex-row gap-3">
            <StatCard
              icon="calculator-outline"
              label="Debt Ratio"
              value={`${debtRatio.toFixed(1)}%`}
              tint="#fbbf24"
            />
            <StatCard
              icon="repeat-outline"
              label="Avg Monthly Commitment"
              value={formatRM(avgMonthlyCommitment)}
              tint="#38bdf8"
            />
          </View>
        </View>

        {/* Asset Distribution */}
        <Section title="Asset Distribution">
          <Card>
            {CATEGORY_ORDER.map((category, index) => {
              const meta = CATEGORY_META[category];
              const value = categoryTotals[category];
              const percent = totalAssets > 0 ? (value / totalAssets) * 100 : 0;
              return (
                <AssetBreakdownRow
                  key={category}
                  icon={meta.icon}
                  label={meta.label}
                  value={value}
                  percent={percent}
                  color={meta.color}
                  isLast={index === CATEGORY_ORDER.length - 1}
                />
              );
            })}
          </Card>
        </Section>

        {/* Zakat Due */}
        <Section title="Zakat Due">
          <Card padded>
            {combineZakat ? (
              (() => {
                const z = zakatByCategory.get("ALL");
                return (
                  <ZakatBreakdownRow
                    label="All Assets"
                    amount={z?.nisab_reached ? z.zakat_due : 0}
                    isNisabReached={z?.nisab_reached ?? false}
                    isLast
                  />
                );
              })()
            ) : (
              CATEGORY_ORDER.map((category, index) => {
                const meta = CATEGORY_META[category];
                const z = zakatByCategory.get(category);
                return (
                  <ZakatBreakdownRow
                    key={category}
                    label={meta.label}
                    amount={z?.nisab_reached ? z.zakat_due : 0}
                    isNisabReached={z?.nisab_reached ?? false}
                    isLast={index === CATEGORY_ORDER.length - 1}
                  />
                );
              })
            )}

            <View className="mt-3 pt-4 border-t border-white/10 flex-row justify-between items-center">
              <Text className="text-slate-300 font-semibold text-[13px]">
                Total Payable
              </Text>
              <Text className="text-emerald-400 text-[19px] font-extrabold">
                {formatRM(totalZakatPayable)}
              </Text>
            </View>
          </Card>
        </Section>

        {/* Nisab Status */}
        <Section title="Nisab Status">
          <Card>
            {combineZakat ? (
              (() => {
                const z = zakatByCategory.get("ALL");
                return (
                  <NisabStatusRow
                    label="All Assets"
                    color="#34d399"
                    current={z?.value ?? 0}
                    nisab={nisab}
                    isLast
                  />
                );
              })()
            ) : (
              CATEGORY_ORDER.map((category, index) => {
              const meta = CATEGORY_META[category];
              const z = zakatByCategory.get(category);
              return (
                <NisabStatusRow
                  key={category}
                  label={meta.label}
                  color={meta.color}
                  current={z?.value ?? 0}
                  nisab={nisab}
                  isLast={index === CATEGORY_ORDER.length - 1}
                />
              );
              })
            )}
          </Card>
        </Section>

        {/* Quick Actions */}
        <View className="mb-4">
          <Text className="text-[13px] font-bold text-slate-300 mb-3 uppercase tracking-wide">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
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
          </View>
        </View>
      </ScrollView>
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

function Card({
  children,
  padded = false,
}: {
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <View
      className={`rounded-3xl bg-white/[0.035] border border-white/10 overflow-hidden ${
        padded ? "p-5" : ""
      }`}
    >
      {children}
    </View>
  );
}

// Content components
function StatCard({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tint: string;
}) {
  return (
    <View className="flex-1 rounded-2xl bg-white/[0.035] border border-white/10 p-4">
      <View
        style={{ backgroundColor: `${tint}1f` }}
        className="h-8 w-8 rounded-lg items-center justify-center mb-3"
      >
        <Ionicons name={icon} size={15} color={tint} />
      </View>
      <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-1 text-[14px] font-bold text-white"
      >
        {value}
      </Text>
      {sub && (
        <Text numberOfLines={1} className="mt-0.5 text-[9px] text-slate-500">
          {sub}
        </Text>
      )}
    </View>
  );
}

function AssetBreakdownRow({
  icon,
  label,
  value,
  percent,
  color,
  isLast = false,
}: {
  icon: any;
  label: string;
  value: number;
  percent: number;
  color: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`px-5 py-4 flex-row items-center justify-between ${
        !isLast ? "border-b border-white/8" : ""
      }`}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View
          style={{ backgroundColor: `${color}1f` }}
          className="h-9 w-9 rounded-xl items-center justify-center"
        >
          <Ionicons name={icon} size={17} color={color} />
        </View>
        <View>
          <Text className="text-[13px] font-semibold text-white">
            {label}
          </Text>
          <Text className="text-[11px] text-slate-500 mt-0.5">
            {percent.toFixed(1)}%
          </Text>
        </View>
      </View>
      <Text className="text-[13px] font-bold text-slate-200">
        {formatRM(value)}
      </Text>
    </View>
  );
}

function ZakatBreakdownRow({
  label,
  amount,
  isNisabReached,
  isLast = false,
}: {
  label: string;
  amount: number;
  isNisabReached: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row justify-between items-center py-2.5 ${
        !isLast ? "border-b border-white/8" : ""
      }`}
    >
      <View className="flex-row items-center gap-2">
        <Ionicons
          name={isNisabReached ? "checkmark-circle" : "close-circle"}
          size={15}
          color={isNisabReached ? "#34d399" : "#64748b"}
        />
        <Text className="text-[13px] font-medium text-slate-200">
          {label}
        </Text>
      </View>
      <Text
        className={`font-semibold text-[13px] ${
          amount > 0 ? "text-white" : "text-slate-600"
        }`}
      >
        {formatRM(amount)}
      </Text>
    </View>
  );
}

function NisabStatusRow({
  label,
  color,
  current,
  nisab,
  isLast = false,
}: {
  label: string;
  color: string;
  current: number;
  nisab: number;
  isLast?: boolean;
}) {
  const isReached = current >= nisab;
  const percent = nisab > 0 ? (current / nisab) * 100 : 0;

  return (
    <View className={`px-5 py-4 ${!isLast ? "border-b border-white/8" : ""}`}>
      <View className="flex-row justify-between items-center mb-2.5">
        <Text className="text-[13px] font-semibold text-white">{label}</Text>
        <View
          className="rounded-full px-2.5 py-1"
          style={{
            backgroundColor: isReached
              ? "rgba(52, 211, 153, 0.12)"
              : "rgba(148, 163, 184, 0.12)",
          }}
        >
          <Text
            className="text-[10px] font-bold uppercase tracking-wide"
            style={{ color: isReached ? "#34d399" : "#94a3b8" }}
          >
            {isReached ? "Reached" : "Pending"}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-[11px] text-slate-500">
          {formatRM(current)} / {formatRM(nisab)}
        </Text>
        <Text className="text-[11px] font-semibold text-slate-400">
          {Math.min(percent, 999).toFixed(0)}%
        </Text>
      </View>

      <View className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{
            width: `${Math.min(percent, 100)}%`,
            backgroundColor: color,
          }}
        />
      </View>
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
    if (label === "Assets") {
      router.push("/(tabs)/asset");
    } else if (label === "Liabilities") {
      router.push("/(tabs)/liability");
    } else if (label === "Zakat") {
      router.push("/(tabs)/zakat-tracker");
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className="flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] py-4"
    >
      <Ionicons name={icon} size={18} color={tint} />
      <Text className="text-[11px] font-semibold text-slate-300">
        {label}
      </Text>
    </TouchableOpacity>
  );
}
