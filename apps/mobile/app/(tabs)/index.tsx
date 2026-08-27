import { AssetCategory } from "@/interface/asset";
import { ZakatTrackerDto } from "@/interface/zakat";
import { useGetAssets } from "@/services/asset";
import { useGetLiabilities } from "@/services/liability";
import { useGetZakatCategories } from "@/services/zakat";
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
  CASH: { label: "Cash & Savings", icon: "cash-outline", color: "#10b981" },
  GOLD: { label: "Gold", icon: "diamond-outline", color: "#f59e0b" },
  CRYPTO: { label: "Crypto", icon: "logo-bitcoin", color: "#8b5cf6" },
  STOCK: { label: "Stock", icon: "trending-up-outline", color: "#06b6d4" },
};
const CATEGORY_ORDER: AssetCategory[] = ["CASH", "GOLD", "CRYPTO", "STOCK"];

export default function DashboardScreen() {
  const { data: assets, isLoading: assetsLoading } = useGetAssets();
  const { data: liabilities, isLoading: liabilitiesLoading } =
    useGetLiabilities();
  const { data: zakatCategories, isLoading: zakatLoading } =
    useGetZakatCategories();

  const isLoading = assetsLoading || liabilitiesLoading || zakatLoading;

  // Totals by category, across every active asset regardless of zakat
  // inclusion — net worth reflects everything you own, not just what's
  // zakatable.
  const categoryTotals = useMemo(() => {
    const totals: Record<AssetCategory, number> = {
      CASH: 0,
      GOLD: 0,
      CRYPTO: 0,
      STOCK: 0,
    };
    for (const a of assets ?? []) {
      totals[a.category] = (totals[a.category] ?? 0) + (a.price ?? 0);
    }
    return totals;
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
      <View className="flex-1 items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <View className="flex-row items-center justify-between px-6 pt-10 pb-2">
        <View>
          <Text className="text-[14px] font-medium text-slate-400">
            Overview
          </Text>
          <Text className="text-[32px] font-bold text-white mt-1">
            My Wealth
          </Text>
        </View>
      </View>

      <ScrollView
        className="p-6"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Net Worth Card */}
        <View className="mb-4 rounded-2xl bg-linear-to-br from-emerald-400 via-emerald-500 to-teal-600 p-4 shadow-lg border border-emerald-300/30">
          <Text className="text-[9px] font-bold text-emerald-50 uppercase tracking-widest opacity-90">
            Net Worth
          </Text>
          <Text className="text-[32px] font-black text-white mt-1 tracking-tight">
            RM{netWorth.toLocaleString()}
          </Text>
        </View>

        {/* Quick Stats Row */}
        <View className="mb-6 flex-row gap-3">
          <StatCard
            icon="wallet-outline"
            label="Total Assets"
            value={`RM${totalAssets.toLocaleString()}`}
            color="emerald"
          />
          <StatCard
            icon="card-outline"
            label="Total Debt"
            value={`RM${totalLiabilities.toLocaleString()}`}
            color="rose"
          />
          <StatCard
            icon="calculator-outline"
            label="Debt Ratio"
            value={`${debtRatio.toFixed(1)}%`}
            color="amber"
          />
        </View>

        {/* Asset Distribution */}
        <View className="mb-6">
          <Text className="text-[14px] font-bold text-white mb-4">
            Asset Distribution
          </Text>
          <View className="rounded-3xl bg-linear-to-br from-slate-700 to-slate-800 border border-slate-500/50 overflow-hidden shadow-xl">
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
          </View>
        </View>

        {/* Zakat Breakdown Section */}
        <View className="mb-6">
          <Text className="text-[14px] font-bold text-white mb-4">
            Zakat Due
          </Text>
          <View className="rounded-2xl bg-linear-to-br from-amber-500/10 to-amber-600/10 border border-amber-500/30 p-5">
            {CATEGORY_ORDER.map((category) => {
              const meta = CATEGORY_META[category];
              const z = zakatByCategory.get(category);
              return (
                <ZakatBreakdownRow
                  key={category}
                  label={meta.label}
                  amount={z?.nisab_reached ? z.zakat_due : 0}
                  isNisabReached={z?.nisab_reached ?? false}
                />
              );
            })}

            <View className="mt-4 pt-4 border-t border-amber-500/30 flex-row justify-between items-center">
              <Text className="text-white font-bold text-[13px]">
                Total Payable
              </Text>
              <Text className="text-amber-300 text-[18px] font-bold">
                RM
                {totalZakatPayable.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Nisab Status */}
        <View className="mb-6">
          <Text className="text-[14px] font-bold text-white mb-4">
            Nisab Status
          </Text>
          <View className="rounded-3xl bg-linear-to-br from-slate-700 via-slate-800 to-slate-900 border border-emerald-500/20 overflow-hidden shadow-xl">
            {CATEGORY_ORDER.map((category, index) => {
              const meta = CATEGORY_META[category];
              const z = zakatByCategory.get(category);
              return (
                <NisabStatusRow
                  key={category}
                  label={meta.label}
                  current={z?.value ?? 0}
                  nisab={nisab}
                  unit="RM"
                  isLast={index === CATEGORY_ORDER.length - 1}
                />
              );
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-4">
          <Text className="text-[14px] font-bold text-white mb-4">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            <QuickActionButton
              icon="wallet-outline"
              label="Assets"
              color="emerald"
            />
            <QuickActionButton
              icon="card-outline"
              label="Liabilities"
              color="rose"
            />
            <QuickActionButton
              icon="hand-right-outline"
              label="Zakat"
              color="amber"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Helper Components
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: "emerald" | "rose" | "amber";
}) {
  const colorMap = {
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      icon: "#10b981",
    },
    rose: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      icon: "#f43f5e",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      icon: "#f59e0b",
    },
  };

  const colors = colorMap[color];

  return (
    <View
      className={`flex-1 rounded-3xl ${colors.bg} ${colors.border} border p-4 shadow-lg`}
    >
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name={icon} size={16} color={colors.icon} />
      </View>
      <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </Text>
      <Text className="mt-1.5 text-[14px] font-bold text-white">{value}</Text>
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
        !isLast ? "border-b border-slate-600" : ""
      }`}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View
          style={{ backgroundColor: `${color}20` }}
          className="rounded-lg p-2"
        >
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View>
          <Text className="text-[12px] font-semibold text-white">{label}</Text>
          <Text className="text-[10px] text-slate-400 mt-0.5">
            {percent.toFixed(1)}%
          </Text>
        </View>
      </View>
      <Text className="text-[13px] font-bold text-slate-100">
        RM{value.toLocaleString()}
      </Text>
    </View>
  );
}

function ZakatBreakdownRow({
  label,
  amount,
  subtext,
  isNisabReached,
}: {
  label: string;
  amount: number;
  subtext?: string;
  isNisabReached: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center mb-3">
      <View>
        <View className="flex-row items-center gap-2">
          <Text className="text-[12px] font-semibold text-slate-200">
            {label}
          </Text>
          {isNisabReached ? (
            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
          ) : (
            <Ionicons name="close-circle" size={14} color="#ef4444" />
          )}
        </View>
        {subtext && (
          <Text className="text-[10px] text-slate-400 mt-0.5">{subtext}</Text>
        )}
      </View>
      <Text
        className={`font-bold text-[12px] ${
          amount > 0 ? "text-white" : "text-slate-500"
        }`}
      >
        RM{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

function NisabStatusRow({
  label,
  current,
  nisab,
  unit,
  isLast = false,
}: {
  label: string;
  current: number;
  nisab: number;
  unit: string;
  isLast?: boolean;
}) {
  const isReached = current >= nisab;
  const percent = nisab > 0 ? (current / nisab) * 100 : 0;

  return (
    <View className={`px-5 py-4 ${!isLast ? "border-b border-slate-600" : ""}`}>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-[12px] font-semibold text-white">{label}</Text>
        <View
          className="flex-row items-center gap-1 rounded-full px-2 py-1"
          style={{
            backgroundColor: isReached ? "#10b98120" : "#f5940020",
          }}
        >
          <Ionicons
            name={isReached ? "checkmark-circle" : "alert-circle-outline"}
            size={12}
            color={isReached ? "#10b981" : "#f59e0b"}
          />
          <Text
            className="text-[10px] font-bold"
            style={{
              color: isReached ? "#10b981" : "#f59e0b",
            }}
          >
            {isReached ? "REACHED" : "PENDING"}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-[11px] text-slate-400">
          {current.toLocaleString()} / {nisab.toLocaleString()} {unit}
        </Text>
        <Text className="text-[11px] font-semibold text-slate-300">
          {percent.toFixed(0)}%
        </Text>
      </View>

      <View className="h-2 rounded-full bg-slate-600 overflow-hidden">
        <View
          className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-400"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </View>
    </View>
  );
}

function QuickActionButton({
  icon,
  label,
  color,
}: {
  icon: any;
  label: string;
  color: "emerald" | "rose" | "amber";
}) {
  const router = useRouter();
  const colorMap = {
    emerald: "from-emerald-500 to-emerald-600",
    rose: "from-rose-500 to-rose-600",
    amber: "from-amber-500 to-amber-600",
  };

  const handlePress = () => {
    if (color === "emerald") {
      router.push("/(tabs)/asset");
    } else if (color === "rose") {
      router.push("/(tabs)/liability");
    } else if (color === "amber") {
      router.push("/(tabs)/zakat-tracker");
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={`flex-1 bg-linear-to-br ${colorMap[color]} rounded-xl py-4 items-center shadow-lg`}
    >
      <Ionicons name={icon} size={20} color="white" />
      <Text className="text-[11px] font-bold text-white mt-1 uppercase tracking-wider">
        {label}
      </Text>
    </TouchableOpacity>
  );
}
