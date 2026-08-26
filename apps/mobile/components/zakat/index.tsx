import { ZakatCategory } from "@/interface/zakat";
import { MOCK_ZAKAT_DATA } from "@/services/zakat-mock";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ZAKAT_RATE = 0.025;

export function ZakatTrackerScreen() {
  const [zakatData, setZakatData] =
    useState<ZakatCategory[]>(MOCK_ZAKAT_DATA);
  const [expandedCategory, setExpandedCategory] =
    useState<string | null>(null);

  /* ===========================
     Helpers
  ============================ */

  const toggleTracking = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setZakatData((prev) =>
      prev.map((cat) =>
        cat.id === id ? { ...cat, isTracked: !cat.isTracked } : cat,
      ),
    );

    if (expandedCategory === id) {
      setExpandedCategory(null);
    }
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "#10b981";
      case "PENDING":
        return "#94a3b8";
      case "DUE":
        return "#f59e0b";
      case "OVERDUE":
        return "#ef4444";
      default:
        return "#94a3b8";
    }
  };

  /* ===========================
     Calculations
  ============================ */

  const totalZakatDue = useMemo(() => {
    return zakatData.reduce((sum, cat) => {
      if (
        cat.isTracked &&
        cat.isNisabReached &&
        (cat.haulStatus === "DUE" || cat.haulStatus === "OVERDUE")
      ) {
        return sum + cat.totalValue * ZAKAT_RATE;
      }
      return sum;
    }, 0);
  }, [zakatData]);

  /* ===========================
     UI
  ============================ */

  return (
    <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <View className="px-6 pt-10 pb-4">
        <Text className="text-[14px] text-slate-400">
          Islamic Finance
        </Text>
        <Text className="text-[32px] font-bold text-white mt-1">
          Zakat Tracker
        </Text>
      </View>

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= TOTAL SUMMARY ================= */}
        <View className="mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-5 py-4">
          <Text className="text-[11px] text-emerald-300 tracking-wider">
            TOTAL ZAKAT DUE
          </Text>
          <Text className="text-[28px] font-bold text-emerald-400 mt-1">
            RM{totalZakatDue.toFixed(2)}
          </Text>
          <Text className="text-[11px] text-emerald-200 mt-1">
            Calculated at 2.5% of eligible assets
          </Text>
        </View>

        {/* ================= ZAKAT CARDS ================= */}
        {zakatData.map((category) => {
          const zakatAmount =
            category.isNisabReached
              ? category.totalValue * ZAKAT_RATE
              : 0;

          return (
            <View
              key={category.id}
              className="mb-4 rounded-2xl bg-slate-700/40 border border-slate-600 px-5 py-4"
              style={{
                shadowColor:
                  category.haulStatus === "DUE" ||
                  category.haulStatus === "OVERDUE"
                    ? getStatusColor(category.haulStatus)
                    : "transparent",
                shadowOpacity: 0.12,
                shadowRadius: 12,
              }}
            >
              {/* Header */}
              <TouchableOpacity
                activeOpacity={category.isTracked ? 0.7 : 1}
                onPress={() =>
                  category.isTracked && toggleExpand(category.id)
                }
                className={`${!category.isTracked ? "opacity-50" : ""}`}
              >
                <View className="flex-row justify-between items-start">
                  <View>
                    <View className="bg-emerald-500/20 self-start rounded-full px-3 py-1">
                      <Text className="text-[11px] font-bold text-emerald-400">
                        {category.name}
                      </Text>
                    </View>

                    <Text className="text-[20px] font-bold text-emerald-400 mt-2">
                      RM{category.totalValue.toLocaleString()}
                    </Text>

                    <Text className="text-[11px] text-slate-400 mt-0.5">
                      Nisab RM{category.nisabAmount.toLocaleString()}
                    </Text>
                  </View>

                  <View className="items-end gap-2">
                    {/* Status */}
                    <View
                      className="rounded-xl px-3 py-1.5"
                      style={{
                        backgroundColor: `${getStatusColor(
                          category.haulStatus,
                        )}20`,
                      }}
                    >
                      <Text
                        className="text-[10px] font-bold tracking-widest"
                        style={{
                          color: getStatusColor(category.haulStatus),
                        }}
                      >
                        {category.haulStatus}
                      </Text>
                    </View>

                    {/* Tracking Pill */}
                    <TouchableOpacity
                      onPress={() => toggleTracking(category.id)}
                      className={`px-3 py-1.5 rounded-full ${
                        category.isTracked
                          ? "bg-emerald-500/20"
                          : "bg-slate-600/30"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          category.isTracked
                            ? "text-emerald-400"
                            : "text-slate-400"
                        }`}
                      >
                        {category.isTracked
                          ? "TRACKING"
                          : "NOT TRACKED"}
                      </Text>
                    </TouchableOpacity>

                    {category.isTracked && (
                      <Ionicons
                        name={
                          expandedCategory === category.id
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={18}
                        color="#94a3b8"
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* ================= EXPANDED ================= */}
              {category.isTracked &&
                expandedCategory === category.id && (
                  <View className="mt-5 gap-3">
                    {/* Info cards */}
                    <View className="flex-row gap-3">
                      <InfoCard
                        label="ZAKAT PAYABLE"
                        value={`RM${zakatAmount.toFixed(2)}`}
                        highlight
                      />
                      <InfoCard
                        label="NISAB"
                        value={`RM${category.nisabAmount.toLocaleString()}`}
                      />
                    </View>

                    <DetailRow
                      label="Nisab Reached"
                      value={category.isNisabReached ? "YES" : "NO"}
                      success={category.isNisabReached}
                    />

                    <DetailRow
                      label="Last Paid Date"
                      value={
                        category.lastPaidDate
                          ? new Date(
                              category.lastPaidDate,
                            ).toLocaleDateString("en-MY", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Never"
                      }
                    />

                    <DetailRow
                      label="Next Due Date"
                      value={new Date(
                        category.nextDueDate,
                      ).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    />

                    {(category.haulStatus === "DUE" ||
                      category.haulStatus === "OVERDUE") && (
                      <TouchableOpacity className="mt-4 bg-emerald-500/90 rounded-xl py-4">
                        <Text className="text-center text-white font-bold tracking-wide">
                          Pay Zakat Now
                        </Text>
                        <Text className="text-center text-[11px] text-emerald-100 mt-0.5">
                          Fulfill your obligation
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ===========================
   Small Components
=========================== */

function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View className="flex-1 bg-slate-700/30 rounded-xl px-4 py-3">
      <Text className="text-[10px] text-slate-400 tracking-wider">
        {label}
      </Text>
      <Text
        className={`text-[16px] font-bold mt-1 ${
          highlight ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  success,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <View className="bg-slate-700/20 rounded-xl px-4 py-3 flex-row justify-between items-center">
      <Text className="text-[11px] text-slate-300">
        {label}
      </Text>
      <Text
        className={`text-[12px] font-semibold ${
          success === undefined
            ? "text-white"
            : success
            ? "text-emerald-400"
            : "text-red-400"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
