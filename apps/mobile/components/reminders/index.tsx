import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { ReminderInterface } from "@/interface/reminder";
import {
  useDeleteReminder,
  useGetReminders,
  useMarkReminderPaid,
  useSetReminderPaused,
} from "@/services/reminder";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { AddReminderModal } from "./add-reminder-modal";
import { NotificationTimingCard } from "./notification-timing-card";
import { REMINDER_RECURRENCE_LABELS } from "./reminder-options";

type Tab = "upcoming" | "due_today" | "overdue" | "completed";

const TABS: { key: Tab; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "due_today", label: "Due Today" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
];

function groupReminders(reminders: ReminderInterface[]) {
  const overdue: ReminderInterface[] = [];
  const dueToday: ReminderInterface[] = [];
  const upcoming: ReminderInterface[] = [];
  const completed: ReminderInterface[] = [];

  for (const r of reminders) {
    if (r.status === "COMPLETED") completed.push(r);
    else if (r.status === "ACTIVE" && r.is_overdue) overdue.push(r);
    else if (r.status === "ACTIVE" && r.is_due_today) dueToday.push(r);
    else upcoming.push(r);
  }

  return { overdue, dueToday, upcoming, completed };
}

export function Reminders() {
  const { data = [], isLoading } = useGetReminders();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderInterface | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { error, isVisible, hideError, showError } = useErrorModal();
  const { mutateAsync: markPaid } = useMarkReminderPaid();
  const { mutateAsync: setPaused } = useSetReminderPaused();
  const { mutateAsync: deleteReminder, isPending: isDeleting } = useDeleteReminder();

  const groups = useMemo(() => groupReminders(data), [data]);
  const counts: Record<Tab, number> = {
    upcoming: groups.upcoming.length,
    due_today: groups.dueToday.length,
    overdue: groups.overdue.length,
    completed: groups.completed.length,
  };

  const listForTab: Record<Tab, ReminderInterface[]> = {
    upcoming: groups.upcoming,
    due_today: groups.dueToday,
    overdue: groups.overdue,
    completed: groups.completed,
  };

  const activeCount = groups.overdue.length + groups.dueToday.length + groups.upcoming.length;

  const openEdit = (reminder: ReminderInterface) => {
    setEditingReminder(reminder);
    setModalVisible(true);
  };

  const openAdd = () => {
    setEditingReminder(null);
    setModalVisible(true);
  };

  const handleMarkPaid = async (id: number) => {
    try {
      await markPaid({ id });
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Failed to mark as paid" });
    }
  };

  const handleTogglePause = async (reminder: ReminderInterface) => {
    try {
      await setPaused({ id: reminder.id, paused: reminder.status !== "PAUSED" });
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Failed to update reminder" });
    }
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
    <View className="flex-1 bg-slate-950">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <View className="flex-row items-center justify-between px-6 pt-10 pb-2">
        <View>
          <Text className="text-[14px] font-medium text-slate-400">Overview</Text>
          <Text className="text-[32px] font-bold text-white mt-1">Reminders</Text>
        </View>
        <TouchableOpacity
          onPress={openAdd}
          className="rounded-full bg-amber-500 px-5 py-3 active:opacity-80"
        >
          <View className="flex-row items-center gap-1">
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-semibold text-[14px]">Add</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View className="px-6">
        {!isLoading && activeCount > 0 && (
          <View className="mb-4 rounded-2xl bg-white/[0.035] border border-white/10 px-4 py-3.5">
            <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {activeCount} active {activeCount === 1 ? "reminder" : "reminders"}
            </Text>
          </View>
        )}

        <NotificationTimingCard />

        <View className="flex-row gap-2 mb-4">
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`flex-1 rounded-lg py-2 items-center ${
                tab === t.key ? "bg-amber-500/15 border border-amber-500/40" : "bg-white/[0.035] border border-white/10"
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${tab === t.key ? "text-amber-400" : "text-slate-400"}`}
              >
                {t.label}
                {counts[t.key] > 0 ? ` (${counts[t.key]})` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        className="px-6 flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && currentList.length > 0 ? (
          <View className="gap-3">
            {currentList.map((reminder) => (
              <ReminderListItem
                key={reminder.id}
                reminder={reminder}
                onPress={() => openEdit(reminder)}
                onMarkPaid={() => handleMarkPaid(reminder.id)}
                onTogglePause={() => handleTogglePause(reminder)}
                onDelete={() => setDeletingId(reminder.id)}
              />
            ))}
          </View>
        ) : (
          !isLoading && (
            <View className="mt-20 items-center justify-center">
              <Ionicons name="notifications-outline" size={48} color="#64748b" />
              <Text className="mt-4 text-[16px] font-medium text-slate-400">
                {tab === "completed" ? "No completed reminders yet" : "Nothing here"}
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
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
  onMarkPaid,
  onTogglePause,
  onDelete,
}: {
  reminder: ReminderInterface;
  onPress: () => void;
  onMarkPaid: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
}) {
  const { name, note, recurrence, status, next_due_date, days_until_due, notification_mode } = reminder;
  const isPaused = status === "PAUSED";
  const isCompleted = status === "COMPLETED";
  const isOverdue = status === "ACTIVE" && days_until_due < 0;
  const isDueToday = status === "ACTIVE" && days_until_due === 0;

  const dueLabel = new Date(next_due_date).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const badgeLabel = isCompleted
    ? "Completed"
    : isPaused
      ? "Paused"
      : isOverdue
        ? `${Math.abs(days_until_due)}d overdue`
        : isDueToday
          ? "Due today"
          : `in ${days_until_due}d`;

  const badgeBg =
    isCompleted || isPaused
      ? "bg-slate-500/20"
      : isOverdue
        ? "bg-red-500/20"
        : isDueToday
          ? "bg-amber-500/20"
          : "bg-white/10";
  const badgeText =
    isCompleted || isPaused
      ? "text-slate-300"
      : isOverdue
        ? "text-red-300"
        : isDueToday
          ? "text-amber-300"
          : "text-slate-300";

  return (
    <View className={`bg-white/[0.035] border border-white/10 rounded-xl px-4 py-4 ${isPaused ? "opacity-60" : ""}`}>
      <TouchableOpacity onPress={onPress} className="flex-row items-center justify-between active:opacity-70">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <View className={`rounded-full px-2.5 py-0.5 ${badgeBg}`}>
              <Text className={`text-[10px] font-bold ${badgeText}`}>{badgeLabel}</Text>
            </View>
            {notification_mode === "custom" && (
              <View className="bg-white/10 rounded-full px-2.5 py-0.5">
                <Text className="text-[10px] font-bold text-slate-300">Custom timing</Text>
              </View>
            )}
          </View>
          <Text className="text-[16px] font-semibold text-white mb-1">{name}</Text>
          <Text className="text-[12px] text-slate-400">
            {REMINDER_RECURRENCE_LABELS[recurrence]} · Due {dueLabel}
          </Text>
          {!!note && (
            <Text className="text-[12px] text-slate-500 mt-1" numberOfLines={2}>
              {note}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {!isCompleted && (
        <View className="mt-3 pt-3 border-t border-white/10 flex-row gap-2">
          <TouchableOpacity
            onPress={onMarkPaid}
            className="flex-1 bg-amber-500 rounded-lg py-2.5 flex-row items-center justify-center gap-1"
          >
            <Ionicons name="checkmark-circle-outline" size={15} color="white" />
            <Text className="text-center font-semibold text-white text-[12px]">Mark Done</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onTogglePause}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 items-center justify-center"
          >
            <Ionicons name={isPaused ? "play-outline" : "pause-outline"} size={16} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 items-center justify-center"
          >
            <Ionicons name="trash-outline" size={16} color="#f87171" />
          </TouchableOpacity>
        </View>
      )}
      {isCompleted && (
        <View className="mt-3 pt-3 border-t border-white/10 flex-row justify-end">
          <TouchableOpacity
            onPress={onDelete}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 items-center justify-center"
          >
            <Ionicons name="trash-outline" size={16} color="#f87171" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
