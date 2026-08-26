import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function DashboardScreen() {
  // 1. RAW DATA (Usually from your Database/State)
  const savings = 45000;
  const goldInvestmentValue = 15000;
  const goldWeightGrams = 42;
  const cryptoValue = 25500;
  const stockValue = 18000;
  const totalDebt = 5000;
  const totalLiabilities = 8500;

  // 2. CONSTANTS (Malaysia 2026)
  const NISAB_RM = 29740;
  const URUF_GRAMS = 800;
  const ZAKAT_RATE = 0.025;

  // 3. LOGIC CALCULATIONS
  const totalAssets = savings + goldInvestmentValue + cryptoValue + stockValue;
  const netWorth = totalAssets - totalLiabilities;
  const debtRatio = (totalLiabilities / totalAssets) * 100;

  // Zakat Calculations
  const zakatSavings = savings >= NISAB_RM ? savings * ZAKAT_RATE : 0;
  const zakatGold =
    goldWeightGrams >= 85 ? goldInvestmentValue * ZAKAT_RATE : 0;
  const zakatCrypto = cryptoValue >= NISAB_RM ? cryptoValue * ZAKAT_RATE : 0;
  const zakatStock = stockValue >= NISAB_RM ? stockValue * ZAKAT_RATE : 0;
  const totalZakat = zakatSavings + zakatGold + zakatCrypto + zakatStock;

  // Asset percentages
  const savingsPercent = (savings / totalAssets) * 100;
  const goldPercent = (goldInvestmentValue / totalAssets) * 100;
  const cryptoPercent = (cryptoValue / totalAssets) * 100;
  const stockPercent = (stockValue / totalAssets) * 100;

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
            <AssetBreakdownRow
              icon="cash-outline"
              label="Cash & Savings"
              value={savings}
              percent={savingsPercent}
              color="#10b981"
            />
            <AssetBreakdownRow
              icon="diamond-outline"
              label="Gold"
              value={goldInvestmentValue}
              percent={goldPercent}
              color="#f59e0b"
            />
            <AssetBreakdownRow
              icon="logo-bitcoin"
              label="Crypto"
              value={cryptoValue}
              percent={cryptoPercent}
              color="#8b5cf6"
            />
            <AssetBreakdownRow
              icon="trending-up-outline"
              label="Stock"
              value={stockValue}
              percent={stockPercent}
              color="#06b6d4"
              isLast
            />
          </View>
        </View>

        {/* Zakat Breakdown Section */}
        <View className="mb-6">
          <Text className="text-[14px] font-bold text-white mb-4">
            Zakat Due
          </Text>
          <View className="rounded-2xl bg-linear-to-br from-amber-500/10 to-amber-600/10 border border-amber-500/30 p-5">
            <ZakatBreakdownRow
              label="Cash & Savings"
              amount={zakatSavings}
              isNisabReached={savings >= NISAB_RM}
            />
            <ZakatBreakdownRow
              label="Gold Investment"
              amount={zakatGold}
              subtext={`${goldWeightGrams}g`}
              isNisabReached={goldWeightGrams >= 85}
            />
            <ZakatBreakdownRow
              label="Crypto/Digital"
              amount={zakatCrypto}
              isNisabReached={cryptoValue >= NISAB_RM}
            />
            <ZakatBreakdownRow
              label="Stocks"
              amount={zakatStock}
              isNisabReached={stockValue >= NISAB_RM}
            />

            <View className="mt-4 pt-4 border-t border-amber-500/30 flex-row justify-between items-center">
              <Text className="text-white font-bold text-[13px]">
                Total Payable
              </Text>
              <Text className="text-amber-300 text-[18px] font-bold">
                RM
                {totalZakat.toLocaleString(undefined, {
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
            <NisabStatusRow
              label="Cash & Savings"
              current={savings}
              nisab={NISAB_RM}
              unit="RM"
            />
            <NisabStatusRow
              label="Gold"
              current={goldWeightGrams}
              nisab={85}
              unit="grams"
              isLast
            />
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
  const percent = (current / nisab) * 100;

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
