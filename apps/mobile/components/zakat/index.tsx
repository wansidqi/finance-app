import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SCREEN_SCROLL_BOTTOM_PADDING } from "@/constants/layout";
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

// One glyph per category — identity is conveyed by icon shape now, not hue.
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  CASH: "wallet-outline",
  GOLD: "diamond-outline",
  CRYPTO: "logo-bitcoin",
  STOCK: "trending-up-outline",
};

const CATEGORY_LABELS: Record<string, string> = {
  CASH: "Cash & Savings",
  GOLD: "Gold",
  CRYPTO: "Crypto",
  STOCK: "Stock",
};

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  PENDING: "time-outline",
  DUE: "alert-circle-outline",
  OVERDUE: "alert-circle",
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
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#663af3" />
      </View>
    );
  }

  if (isError || !zakatData) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <Text className="font-sans text-mist text-center">
          Couldn&apos;t load your zakat categories.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader
        eyebrow="Islamic Finance"
        title="Zakat Tracker"
        right={
          <IconButton
            onPress={() => setHideAmounts(!hideAmounts)}
            icon={hideAmounts ? "eye-off-outline" : "eye-outline"}
            label={hideAmounts ? "Show amounts" : "Hide amounts"}
          />
        }
      />

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: SCREEN_SCROLL_BOTTOM_PADDING }}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= TOTALS ================= */}
        <Card className="mb-6">
          <Text className="font-mono text-[11px] uppercase tracking-wider text-fog">
            Total Zakat Due
          </Text>
          <Text className="font-display text-[28px] text-white mt-1">
            {formatRM(totalZakatDue, { decimals: true })}
          </Text>
          <Text className="font-sans text-[11px] text-fog mt-1">
            Calculated at 2.5% of eligible assets
          </Text>

          <View className="h-px bg-glass-edge mt-5 mb-4" />

          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-mono text-[11px] uppercase tracking-wider text-fog">
                Total Zakatable
              </Text>
              <Text className="font-sans text-[10px] text-fog mt-1">
                Across categories that have reached nisab, even before
                their haul year is complete
              </Text>
            </View>
            <Text className="font-display text-[20px] text-frost">
              {formatRM(totalZakatable, { decimals: true })}
            </Text>
          </View>
        </Card>

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
            <Card key={category.category} padded={false} className="mb-4 px-5 py-4">
              {/* Header */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleExpand(category.category)}
              >
                <View className="flex-row justify-between items-center mb-2.5">
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name={CATEGORY_ICONS[category.category] ?? "wallet-outline"}
                      size={15}
                      color="#d1e4fa"
                    />
                    <Text className="font-sans text-[15px] font-semibold text-white">
                      {CATEGORY_LABELS[category.category] ?? category.category}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Badge
                      label={cardStatus}
                      icon={STATUS_ICON[cardStatus]}
                      emphasis={cardStatus === "OVERDUE"}
                    />
                    <Ionicons
                      name={
                        expandedCategory === category.category
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={16}
                      color="#9da7ba"
                    />
                  </View>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-sans text-[11px] text-fog">
                    {formatRM(category.value)} / {formatNisab(category.nisab)}
                  </Text>
                  <Text className="font-sans text-[11px] font-semibold text-mist">
                    {displayPercent.toFixed(0)}%
                  </Text>
                </View>

                <View className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <View
                    className="h-full rounded-full bg-frost"
                    style={{ width: `${Math.min(nisabPercent, 100)}%` }}
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
                      className="mt-4 bg-violet rounded-button py-4"
                    >
                      <Text className="font-sans text-center text-white font-bold tracking-wide">
                        Pay Zakat Now
                      </Text>
                      <Text className="font-sans text-center text-[11px] text-white/70 mt-0.5">
                        Fulfill your obligation
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
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
    <Card padded={false} className="flex-1 px-4 py-3">
      <Text className="font-sans text-[10px] text-mist tracking-wider">
        {label}
      </Text>
      <Text
        className={`font-sans text-[16px] font-bold mt-1 ${
          highlight ? "text-frost" : "text-white"
        }`}
      >
        {value}
      </Text>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <Card padded={false} className="px-4 py-3 flex-row justify-between items-start gap-3">
      <Text className="font-sans text-[11px] text-mist pt-0.5">
        {label}
      </Text>
      <View className="flex-1 flex-row justify-end items-start gap-2">
        <Text className="font-sans text-[12px] font-semibold text-right flex-1 text-white">
          {value}
        </Text>
        {onEdit && (
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${label.toLowerCase()}`}
          >
            <Ionicons name="pencil-outline" size={13} color="#9da7ba" />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}
