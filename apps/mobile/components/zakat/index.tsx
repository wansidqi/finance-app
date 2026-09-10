import { useFormatRM } from "@/hooks/use-format-rm";
import { ZakatTrackerDto } from "@/interface/zakat";
import { useGetZakatCategories, useUpdateZakatTracker } from "@/services/zakat";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { EditPaidDateModal } from "./edit-paid-date-modal";
import {
  ActivityIndicator,
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

// Same palette + labels as the Dashboard's Nisab Status section, keyed by
// AssetCategory so the progress bar reads as the same concept in both places.
const CATEGORY_COLORS: Record<string, string> = {
  CASH: "#34d399",
  GOLD: "#fbbf24",
  CRYPTO: "#a78bfa",
  STOCK: "#38bdf8",
};

const CATEGORY_LABELS: Record<string, string> = {
  CASH: "Cash & Savings",
  GOLD: "Gold",
  CRYPTO: "Crypto",
  STOCK: "Stock",
};

export function ZakatTrackerScreen() {
  const { formatRM, hideAmounts, setHideAmounts } = useFormatRM();
  const { data: zakatData, isLoading, isError } = useGetZakatCategories();
  const updateTracker = useUpdateZakatTracker();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    null,
  );
  const [editingCategory, setEditingCategory] =
    useState<ZakatTrackerDto | null>(null);

  /* ===========================
     Helpers
  ============================ */

  // "Pay Zakat Now" pays as of today directly — no manual date entry needed.
  // The pencil icon on "Last Paid Date" remains for backdating/correcting it.
  const payNow = (category: ZakatTrackerDto) => {
    updateTracker.mutate({
      category: category.category,
      status: "ACTIVE",
      last_paid_date: new Date().toISOString(),
    });
  };

  const savePaidDate = (isoDate: string) => {
    if (!editingCategory) return;
    updateTracker.mutate(
      {
        category: editingCategory.category,
        status: "ACTIVE",
        last_paid_date: isoDate,
      },
      { onSuccess: () => setEditingCategory(null) },
    );
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const formatWithHijri = (isoDate: string, hijri: string | null) => {
    const gregorian = new Date(isoDate).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return hijri ? `${gregorian} • ${hijri}` : gregorian;
  };

  const formatNisab = (nisab: number | null) =>
    nisab != null ? formatRM(nisab, { alwaysShow: true }) : "—";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "#94a3b8";
      case "DUE":
        return "#fbbf24";
      case "OVERDUE":
        return "#fb7185";
      default:
        return "#94a3b8";
    }
  };

  /* ===========================
     Calculations
  ============================ */

  const totalZakatDue = useMemo(() => {
    if (!zakatData) return 0;
    return zakatData.reduce((sum, cat) => {
      if (cat.haul_status === "DUE" || cat.haul_status === "OVERDUE") {
        return sum + cat.zakat_due;
      }
      return sum;
    }, 0);
  }, [zakatData]);

  // Categories already holding nisab, regardless of whether their haul year
  // has completed — lets the user see what they'd owe today even before
  // it's formally due, distinct from totalZakatDue which only counts
  // haul-completed categories.
  const totalZakatable = useMemo(() => {
    if (!zakatData) return 0;
    return zakatData.reduce((sum, cat) => {
      return cat.nisab_reached ? sum + cat.zakat_due : sum;
    }, 0);
  }, [zakatData]);

  /* ===========================
     UI
  ============================ */

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#34d399" />
      </View>
    );
  }

  if (isError || !zakatData) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-6">
        <Text className="text-slate-300 text-center">
          Couldn&apos;t load your zakat categories.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-start justify-between px-6 pt-20 pb-6">
        <View>
          <Text className="text-[13px] font-medium text-slate-500">Islamic Finance</Text>
          <Text className="text-[30px] font-bold text-white mt-1 tracking-tight">
            Zakat Tracker
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setHideAmounts(!hideAmounts)}
          className="p-2 rounded-full bg-white/5 active:opacity-70"
        >
          <Ionicons
            name={hideAmounts ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#cbd5e1"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= TOTALS ================= */}
        <View className="mb-6 rounded-[24px] bg-white/[0.035] border border-white/10 px-5 py-5">
          <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Zakat Due
          </Text>
          <Text className="text-[28px] font-extrabold text-white mt-1">
            {formatRM(totalZakatDue, { decimals: true })}
          </Text>
          <Text className="text-[11px] text-slate-500 mt-1">
            Calculated at 2.5% of eligible assets
          </Text>

          <View className="h-px bg-white/8 mt-5 mb-4" />

          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Zakatable
              </Text>
              <Text className="text-[10px] text-slate-500 mt-1">
                Across categories that have reached nisab, even before
                their haul year is complete
              </Text>
            </View>
            <Text className="text-[20px] font-extrabold text-emerald-400">
              {formatRM(totalZakatable, { decimals: true })}
            </Text>
          </View>
        </View>

        {/* ================= ZAKAT CARDS ================= */}
        {zakatData.map((category) => {
          const cardStatus = category.haul_status;
          const nisabPercent =
            category.nisab != null && category.nisab > 0
              ? (category.value / category.nisab) * 100
              : 0;
          // Cap the *displayed* percentage below 100 unless nisab is
          // actually reached — otherwise e.g. 99.6% rounds to "100%" via
          // toFixed(0) and falsely reads as reached. No upper cap once
          // reached — holdings well past nisab just show their real percentage.
          const displayPercent = category.nisab_reached
            ? nisabPercent
            : Math.min(nisabPercent, 99);

          return (
            <View
              key={category.category}
              className="mb-4 rounded-2xl bg-white/[0.035] border border-white/10 px-5 py-4"
              style={{
                shadowColor:
                  cardStatus === "DUE" || cardStatus === "OVERDUE"
                    ? getStatusColor(cardStatus)
                    : "transparent",
                shadowOpacity: 0.12,
                shadowRadius: 12,
              }}
            >
              {/* Header */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleExpand(category.category)}
              >
                <View className="flex-row justify-between items-center mb-2.5">
                  <Text className="text-[15px] font-semibold text-white">
                    {CATEGORY_LABELS[category.category] ?? category.category}
                  </Text>

                  <View className="flex-row items-center gap-2">
                    <View
                      className="rounded-full px-2.5 py-1"
                      style={{
                        backgroundColor: `${getStatusColor(cardStatus)}20`,
                      }}
                    >
                      <Text
                        className="text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: getStatusColor(cardStatus) }}
                      >
                        {cardStatus}
                      </Text>
                    </View>

                    <Ionicons
                      name={
                        expandedCategory === category.category
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={16}
                      color="#94a3b8"
                    />
                  </View>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[11px] text-slate-500">
                    {formatRM(category.value)} / {formatNisab(category.nisab)}
                  </Text>
                  <Text className="text-[11px] font-semibold text-slate-400">
                    {displayPercent.toFixed(0)}%
                  </Text>
                </View>

                <View className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(nisabPercent, 100)}%`,
                      backgroundColor:
                        CATEGORY_COLORS[category.category] ?? "#34d399",
                    }}
                  />
                </View>
              </TouchableOpacity>

              {/* ================= EXPANDED ================= */}
              {expandedCategory === category.category && (
                <View className="mt-5 gap-3">
                  {/* Info cards */}
                  <View className="flex-row gap-3">
                    <InfoCard
                      label="ZAKAT PAYABLE"
                      value={formatRM(category.zakat_due)}
                      highlight
                    />
                    <InfoCard
                      label="NISAB"
                      value={formatNisab(category.nisab)}
                    />
                  </View>

                  <DetailRow
                    label="Nisab Reached"
                    value={
                      category.nisab_reached === null
                        ? "UNKNOWN"
                        : category.nisab_reached
                          ? "YES"
                          : "NO"
                    }
                    success={category.nisab_reached ?? undefined}
                  />

                  <DetailRow
                    label="Last Paid Date"
                    value={
                      category.last_paid_date
                        ? formatWithHijri(
                            category.last_paid_date,
                            category.last_paid_date_hijri,
                          )
                        : "Never"
                    }
                    onEdit={
                      category.nisab_reached
                        ? () => setEditingCategory(category)
                        : undefined
                    }
                  />

                  <DetailRow
                    label="Next Due Date"
                    value={
                      category.next_due_date
                        ? formatWithHijri(
                            category.next_due_date,
                            category.next_due_date_hijri,
                          )
                        : "Awaiting nisab"
                    }
                  />

                  {(cardStatus === "DUE" || cardStatus === "OVERDUE") && (
                    <TouchableOpacity
                      onPress={() => payNow(category)}
                      disabled={updateTracker.isPending}
                      className="mt-4 bg-emerald-500 rounded-xl py-4"
                    >
                      <Text className="text-center text-emerald-950 font-bold tracking-wide">
                        Pay Zakat Now
                      </Text>
                      <Text className="text-center text-[11px] text-emerald-950/70 mt-0.5">
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

      <EditPaidDateModal
        visible={!!editingCategory}
        category={editingCategory?.category ?? ""}
        initialDate={editingCategory?.last_paid_date ?? null}
        onCancel={() => setEditingCategory(null)}
        onConfirm={savePaidDate}
        isLoading={updateTracker.isPending}
      />
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
    <View className="flex-1 bg-white/[0.03] rounded-xl px-4 py-3">
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
  onEdit,
}: {
  label: string;
  value: string;
  success?: boolean;
  onEdit?: () => void;
}) {
  return (
    <View className="bg-white/[0.03] rounded-xl px-4 py-3 flex-row justify-between items-start gap-3">
      <Text className="text-[11px] text-slate-300 pt-0.5">
        {label}
      </Text>
      <View className="flex-1 flex-row justify-end items-start gap-2">
        <Text
          className={`text-[12px] font-semibold text-right flex-1 ${
            success === undefined
              ? "text-white"
              : success
              ? "text-emerald-400"
              : "text-rose-400"
          }`}
        >
          {value}
        </Text>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} hitSlop={8}>
            <Ionicons name="pencil" size={13} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
