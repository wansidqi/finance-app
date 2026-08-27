import { ZakatTrackerDto } from "@/interface/zakat";
import { useGetZakatCategories, useUpdateZakatTracker } from "@/services/zakat";
import {
  sendTestDueSequence,
  sendTestNotification,
  syncZakatReminders,
} from "@/services/zakat-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
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

export function ZakatTrackerScreen() {
  const { data: zakatData, isLoading, isError } = useGetZakatCategories();
  const updateTracker = useUpdateZakatTracker();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    null,
  );
  const [editingCategory, setEditingCategory] =
    useState<ZakatTrackerDto | null>(null);
  const [testNotificationState, setTestNotificationState] = useState<
    "idle" | "sending" | "sent" | "denied"
  >("idle");
  const [testSequenceState, setTestSequenceState] = useState<
    "idle" | "sending" | "sent" | "denied"
  >("idle");

  const handleSendTestNotification = async () => {
    setTestNotificationState("sending");
    const granted = await sendTestNotification();
    setTestNotificationState(granted ? "sent" : "denied");
    setTimeout(() => setTestNotificationState("idle"), 3000);
  };

  const handleSendTestSequence = async () => {
    setTestSequenceState("sending");
    const granted = await sendTestDueSequence();
    setTestSequenceState(granted ? "sent" : "denied");
    setTimeout(() => setTestSequenceState("idle"), 20000);
  };

  useEffect(() => {
    if (!zakatData) return;
    syncZakatReminders(zakatData).catch((err) =>
      console.warn("Failed to sync zakat reminders", err),
    );
  }, [zakatData]);

  /* ===========================
     Helpers
  ============================ */

  const toggleTracking = (category: ZakatTrackerDto) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    updateTracker.mutate({
      category: category.category,
      status: category.is_tracked ? "INACTIVE" : "ACTIVE",
    });

    if (expandedCategory === category.category) {
      setExpandedCategory(null);
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
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
    if (!zakatData) return 0;
    return zakatData.reduce((sum, cat) => {
      if (
        cat.is_tracked &&
        (cat.haul_status === "DUE" || cat.haul_status === "OVERDUE")
      ) {
        return sum + cat.zakat_due;
      }
      return sum;
    }, 0);
  }, [zakatData]);

  /* ===========================
     UI
  ============================ */

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  if (isError || !zakatData) {
    return (
      <View className="flex-1 items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 px-6">
        <Text className="text-slate-300 text-center">
          Couldn&apos;t load your zakat categories.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <View className="px-6 pt-10 pb-4 flex-row items-start justify-between">
        <View>
          <Text className="text-[14px] text-slate-400">
            Islamic Finance
          </Text>
          <Text className="text-[32px] font-bold text-white mt-1">
            Zakat Tracker
          </Text>
        </View>

        <View className="mt-2 items-end gap-2">
          <TouchableOpacity
            onPress={handleSendTestNotification}
            disabled={testNotificationState === "sending"}
            className="flex-row items-center gap-1.5 bg-slate-700/40 border border-slate-600 rounded-full px-3 py-2"
          >
            <Ionicons
              name={
                testNotificationState === "sent"
                  ? "checkmark-circle"
                  : testNotificationState === "denied"
                    ? "close-circle"
                    : "notifications-outline"
              }
              size={14}
              color={
                testNotificationState === "sent"
                  ? "#10b981"
                  : testNotificationState === "denied"
                    ? "#ef4444"
                    : "#94a3b8"
              }
            />
            <Text className="text-[10px] font-bold text-slate-300">
              {testNotificationState === "sending"
                ? "Sending…"
                : testNotificationState === "sent"
                  ? "Sent!"
                  : testNotificationState === "denied"
                    ? "No permission"
                    : "Test"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSendTestSequence}
            disabled={testSequenceState === "sending"}
            className="flex-row items-center gap-1.5 bg-slate-700/40 border border-slate-600 rounded-full px-3 py-2"
          >
            <Ionicons
              name={
                testSequenceState === "sent"
                  ? "checkmark-circle"
                  : testSequenceState === "denied"
                    ? "close-circle"
                    : "layers-outline"
              }
              size={14}
              color={
                testSequenceState === "sent"
                  ? "#10b981"
                  : testSequenceState === "denied"
                    ? "#ef4444"
                    : "#94a3b8"
              }
            />
            <Text className="text-[10px] font-bold text-slate-300">
              {testSequenceState === "sending"
                ? "Running…"
                : testSequenceState === "sent"
                  ? "Started!"
                  : testSequenceState === "denied"
                    ? "No permission"
                    : "7/5/3/1/0"}
            </Text>
          </TouchableOpacity>
        </View>
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
          const cardStatus = category.is_tracked
            ? category.haul_status
            : "PENDING";

          return (
            <View
              key={category.category}
              className="mb-4 rounded-2xl bg-slate-700/40 border border-slate-600 px-5 py-4"
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
                activeOpacity={category.is_tracked ? 0.7 : 1}
                onPress={() =>
                  category.is_tracked && toggleExpand(category.category)
                }
                className={`${!category.is_tracked ? "opacity-50" : ""}`}
              >
                <View className="flex-row justify-between items-start">
                  <View>
                    <View className="bg-emerald-500/20 self-start rounded-full px-3 py-1">
                      <Text className="text-[11px] font-bold text-emerald-400">
                        {category.category}
                      </Text>
                    </View>

                    <Text className="text-[20px] font-bold text-emerald-400 mt-2">
                      RM{category.value.toLocaleString()}
                    </Text>

                    <Text className="text-[11px] text-slate-400 mt-0.5">
                      Nisab RM{category.nisab.toLocaleString()}
                    </Text>
                  </View>

                  <View className="items-end gap-2">
                    {/* Status */}
                    {category.is_tracked && (
                      <View
                        className="rounded-xl px-3 py-1.5"
                        style={{
                          backgroundColor: `${getStatusColor(
                            cardStatus,
                          )}20`,
                        }}
                      >
                        <Text
                          className="text-[10px] font-bold tracking-widest"
                          style={{
                            color: getStatusColor(cardStatus),
                          }}
                        >
                          {cardStatus}
                        </Text>
                      </View>
                    )}

                    {/* Tracking Pill */}
                    <TouchableOpacity
                      onPress={() => toggleTracking(category)}
                      className={`px-3 py-1.5 rounded-full ${
                        category.is_tracked
                          ? "bg-emerald-500/20"
                          : "bg-slate-600/30"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          category.is_tracked
                            ? "text-emerald-400"
                            : "text-slate-400"
                        }`}
                      >
                        {category.is_tracked ? "TRACKING" : "NOT TRACKED"}
                      </Text>
                    </TouchableOpacity>

                    {category.is_tracked && (
                      <Ionicons
                        name={
                          expandedCategory === category.category
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
              {category.is_tracked &&
                expandedCategory === category.category && (
                  <View className="mt-5 gap-3">
                    {/* Info cards */}
                    <View className="flex-row gap-3">
                      <InfoCard
                        label="ZAKAT PAYABLE"
                        value={`RM${category.zakat_due.toFixed(2)}`}
                        highlight
                      />
                      <InfoCard
                        label="NISAB"
                        value={`RM${category.nisab.toLocaleString()}`}
                      />
                    </View>

                    <DetailRow
                      label="Nisab Reached"
                      value={category.nisab_reached ? "YES" : "NO"}
                      success={category.nisab_reached}
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
                      onEdit={() => setEditingCategory(category)}
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
                        onPress={() => setEditingCategory(category)}
                        disabled={updateTracker.isPending}
                        className="mt-4 bg-emerald-500/90 rounded-xl py-4"
                      >
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
  onEdit,
}: {
  label: string;
  value: string;
  success?: boolean;
  onEdit?: () => void;
}) {
  return (
    <View className="bg-slate-700/20 rounded-xl px-4 py-3 flex-row justify-between items-start gap-3">
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
              : "text-red-400"
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
