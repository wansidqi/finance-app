import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SCREEN_SCROLL_BOTTOM_PADDING } from "@/constants/layout";
import { ReminderInterface } from "@/interface/reminder";
import { useDeleteReminder, useGetReminders } from "@/services/reminder";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { AddReminderModal } from "./add-reminder-modal";
import { NotificationTimingCard } from "./notification-timing-card";
import { REMINDER_RECURRENCE_LABELS } from "./reminder-options";

// No "completed" tab — recurring reminders roll to their next cycle on
// their own (see local/reminder-service.ts's advanceOverdueRecurringReminders),
// and a one-time reminder is considered done simply by deleting it.
//
// No separate "overdue" tab either — a recurring reminder is rolled forward
// before it's ever read (so it never actually renders as overdue), and a
// one-time reminder past its date is just as urgent as one due today, so
// both land in "Due Today" (the card's own badge still says "Xd overdue").
type Tab = "upcoming" | "due_today";

const TABS: { key: Tab; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "due_today", label: "Due Today" },
];

function groupReminders(reminders: ReminderInterface[]) {
  const dueToday: ReminderInterface[] = [];
  const upcoming: ReminderInterface[] = [];

  for (const r of reminders) {
    if (r.status === "ACTIVE" && (r.is_overdue || r.is_due_today)) dueToday.push(r);
    else upcoming.push(r);
  }

  // Nearest to today leads in both tabs: soonest due date first for what's
  // still ahead, and least-overdue (most recent due date) first for what's
  // already passed — furthest away sinks to the bottom either way.
  dueToday.sort((a, b) => new Date(b.next_due_date).getTime() - new Date(a.next_due_date).getTime());
  upcoming.sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());

  return { dueToday, upcoming };
}

export function Reminders() {
  const router = useRouter();
  const { data = [], isLoading } = useGetReminders();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderInterface | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { error, isVisible, hideError, showError } = useErrorModal();
  const { mutateAsync: deleteReminder, isPending: isDeleting } = useDeleteReminder();

  const groups = useMemo(() => groupReminders(data), [data]);
  const counts: Record<Tab, number> = {
    upcoming: groups.upcoming.length,
    due_today: groups.dueToday.length,
  };

  const listForTab: Record<Tab, ReminderInterface[]> = {
    upcoming: groups.upcoming,
    due_today: groups.dueToday,
  };

  const activeCount = groups.dueToday.length + groups.upcoming.length;

  const openEdit = (reminder: ReminderInterface) => {
    setEditingReminder(reminder);
    setModalVisible(true);
  };

  const openAdd = () => {
    setEditingReminder(null);
    setModalVisible(true);
  };

  const handleDelete = async () => {
    if (deletingId == null) return;
    try {
      await deleteReminder(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Failed to delete reminder" });
    }
  };

  const currentList = listForTab[tab];

  return (
    <View className="flex-1 bg-canvas">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <ScreenHeader
        variant="back"
        title="Reminders"
        onBack={() => router.back()}
        right={<Button label="Add" icon="add" variant="primary" onPress={openAdd} />}
      />

      <View className="px-6">
        {!isLoading && activeCount > 0 && (
          <Text className="mb-4 font-mono text-[11px] font-semibold text-fog uppercase tracking-wider">
            {activeCount} active {activeCount === 1 ? "reminder" : "reminders"}
          </Text>
        )}

        <NotificationTimingCard />
      </View>

      <View className="mb-4">
        <ChipGroup
          scrollable
          className="px-6"
          options={TABS.map((t) => ({
            value: t.key,
            label: counts[t.key] > 0 ? `${t.label} (${counts[t.key]})` : t.label,
          }))}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView
        className="px-6 flex-1"
        contentContainerStyle={{ paddingBottom: SCREEN_SCROLL_BOTTOM_PADDING }}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && currentList.length > 0 ? (
          <View className="gap-3">
            {currentList.map((reminder) => (
              <ReminderListItem
                key={reminder.id}
                reminder={reminder}
                onPress={() => openEdit(reminder)}
                onDelete={() => setDeletingId(reminder.id)}
              />
            ))}
          </View>
        ) : (
          !isLoading && (
            <View className="mt-20 items-center justify-center">
              <Ionicons name="notifications-outline" size={48} color="#9da7ba" />
              <Text className="mt-4 font-sans text-[16px] font-medium text-mist">Nothing here</Text>
              <Text className="mt-1 font-sans text-[13px] text-fog">
                {tab === "upcoming" ? "Add your first reminder to get started" : ""}
              </Text>
            </View>
          )
        )}
      </ScrollView>

      <AddReminderModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        reminder={editingReminder}
      />

      <ConfirmDeleteModal
        visible={deletingId != null}
        title="Delete this reminder?"
        description="This can't be undone. Any scheduled notifications for it will be cancelled."
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </View>
  );
}

function ReminderListItem({
  reminder,
  onPress,
  onDelete,
}: {
  reminder: ReminderInterface;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { name, note, recurrence, status, next_due_date, days_until_due, notification_mode } = reminder;
  // Only ever set internally (e.g. a liability reminder pauses itself once
  // paid off) — there's no user-facing pause control anymore.
  const isPaused = status === "PAUSED";
  const isOverdue = status === "ACTIVE" && days_until_due < 0;
  const isDueToday = status === "ACTIVE" && days_until_due === 0;

  const dueLabel = new Date(next_due_date).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const badgeLabel = isPaused
    ? "Paused"
    : isOverdue
      ? `${Math.abs(days_until_due)}d overdue`
      : isDueToday
        ? "Due today"
        : `in ${days_until_due}d`;

  const badgeIcon = isPaused
    ? "pause-outline"
    : isOverdue
      ? "alert-circle-outline"
      : isDueToday
        ? "calendar-outline"
        : "time-outline";

  return (
    <Card className={isPaused ? "opacity-60" : ""}>
      <TouchableOpacity onPress={onPress} className="flex-row items-center justify-between active:opacity-70">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Badge label={badgeLabel} icon={badgeIcon} emphasis={isOverdue} />
            {recurrence !== "daily" && notification_mode === "custom" && (
              <Badge label="Custom timing" />
            )}
          </View>
          <Text className="font-sans text-[16px] font-semibold text-white mb-1">{name}</Text>
          <Text className="font-sans text-[12px] text-mist">
            {REMINDER_RECURRENCE_LABELS[recurrence]} · Due {dueLabel}
          </Text>
          {!!note && (
            <Text className="font-sans text-[12px] text-fog mt-1" numberOfLines={2}>
              {note}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View className="mt-3 pt-3 border-t border-glass-edge flex-row gap-2">
        <TouchableOpacity
          onPress={onPress}
          className="flex-1 bg-white/5 border border-glass-edge rounded-input py-2.5 flex-row items-center justify-center gap-1"
        >
          <Ionicons name="pencil-outline" size={14} color="#d1e4fa" />
          <Text className="font-sans text-center font-semibold text-mist text-[12px]">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete reminder"
          className="bg-white/5 border border-glass-edge rounded-input px-3 py-2.5 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={16} color="#d1e4fa" />
        </TouchableOpacity>
      </View>
    </Card>
  );
}
