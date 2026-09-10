import { calendarDateToIso, DateField, isoToCalendarDate, today } from "@/components/date-field";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { TimeField } from "@/components/time-field";
import { ReminderInterface, ReminderRecurrence, ReminderTimingMode } from "@/interface/reminder";
import {
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
  DEFAULT_REMINDER_OFFSETS_DAYS,
} from "@/local/reminder-notification-settings-service";
import { useCreateReminder, useUpdateReminder } from "@/services/reminder";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DaysBeforeDueField, withDueDayIncluded } from "./days-before-due-picker";
import { REMINDER_RECURRENCES, REMINDER_RECURRENCE_LABELS } from "./reminder-options";

// Matches the floating tab bar height in app/(tabs)/_layout.tsx, so the
// sheet's bottom row of buttons doesn't sit underneath it.
const TAB_BAR_BASE_HEIGHT = 52;

type Props = {
  visible: boolean;
  onClose: () => void;
  reminder?: ReminderInterface | null;
};

export function AddReminderModal({ visible, onClose, reminder }: Props) {
  const isEditing = !!reminder;

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>("monthly");
  const [intervalDays, setIntervalDays] = useState("30");
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const [timingMode, setTimingMode] = useState<ReminderTimingMode>("global");
  const [offsets, setOffsets] = useState<number[]>(DEFAULT_REMINDER_OFFSETS_DAYS);
  const [hour, setHour] = useState(DEFAULT_REMINDER_HOUR);
  const [minute, setMinute] = useState(DEFAULT_REMINDER_MINUTE);

  const { mutateAsync: createReminder, isPending: isCreating } = useCreateReminder();
  const { mutateAsync: updateReminder, isPending: isUpdating } = useUpdateReminder();
  const { error, isVisible, hideError, showError } = useErrorModal();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;

    setDueDate(reminder ? isoToCalendarDate(reminder.next_due_date) : today());

    setName(reminder?.name ?? "");
    setNote(reminder?.note ?? "");
    setRecurrence(reminder?.recurrence ?? "monthly");
    setIntervalDays(reminder?.recurrence_interval_days?.toString() ?? "30");

    setTimingMode(reminder?.notification_mode ?? "global");
    setOffsets(withDueDayIncluded(reminder?.notification_offsets_days ?? DEFAULT_REMINDER_OFFSETS_DAYS));
    setHour(reminder?.notification_hour ?? DEFAULT_REMINDER_HOUR);
    setMinute(reminder?.notification_minute ?? DEFAULT_REMINDER_MINUTE);
  }, [visible, reminder]);

  const resetAndClose = () => {
    onClose();
  };

  const handleSave = async () => {
    const isoDate = dueDate ? calendarDateToIso(dueDate) : null;
    if (!name.trim() || !isoDate) return;

    // Daily reminders fire every day, so "days before due" doesn't apply —
    // only the time is customizable for them.
    const data: Partial<ReminderInterface> = {
      name: name.trim(),
      recurrence,
      recurrence_interval_days: recurrence === "custom" ? Number(intervalDays) || 30 : null,
      next_due_date: isoDate,
      note: note.trim() || null,
      notification_mode: timingMode,
      notification_offsets_days: timingMode === "custom" && recurrence !== "daily" ? offsets : null,
      notification_hour: timingMode === "custom" ? hour : null,
      notification_minute: timingMode === "custom" ? minute : null,
    };

    try {
      if (isEditing) {
        await updateReminder({ id: reminder.id, data });
      } else {
        await createReminder(data);
      }
      resetAndClose();
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Unknown error" });
    }
  };

  const isSaving = isCreating || isUpdating;
  const isoPreview = dueDate ? calendarDateToIso(dueDate) : null;
  const isComplete = !!name.trim() && !!isoPreview;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4 max-h-[90%]"
          >
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="text-[20px] font-bold text-white">
                  {isEditing ? "Edit Reminder" : "Add Reminder"}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Anything you want to be reminded about
                </Text>
              </View>
              <TouchableOpacity onPress={resetAndClose} className="p-2 rounded-full bg-slate-700/50">
                <Ionicons name="close" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              className="px-6"
              keyboardShouldPersistTaps="handled"
            >
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Name
                </Text>
                <TextInput
                  placeholder="e.g., Rent, Service Car, Visit Clinic"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Description (optional)
                </Text>
                <TextInput
                  placeholder="Shown here, and used as the notification's message instead of 'Due today.'"
                  value={note}
                  onChangeText={setNote}
                  placeholderTextColor="#64748b"
                  multiline
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Recurrence
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {REMINDER_RECURRENCES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRecurrence(r)}
                      className={`rounded-lg px-3 py-2 border-2 ${
                        recurrence === r
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <Text
                        className={`font-bold text-[12px] ${
                          recurrence === r ? "text-indigo-400" : "text-slate-300"
                        }`}
                      >
                        {REMINDER_RECURRENCE_LABELS[r]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {recurrence === "custom" && (
                <View className="mb-4">
                  <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Repeat every (days)
                  </Text>
                  <TextInput
                    placeholder="30"
                    keyboardType="number-pad"
                    value={intervalDays}
                    onChangeText={setIntervalDays}
                    placeholderTextColor="#64748b"
                    className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                  />
                </View>
              )}

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  {isEditing ? "Next Due Date" : "Due Date"}
                </Text>
                <DateField value={dueDate} onChange={setDueDate} accentColor="#6366f1" />
              </View>

              <View className="mb-6">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Notification Timing
                </Text>
                <View className="flex-row gap-2 mb-3">
                  {(["global", "custom"] as ReminderTimingMode[]).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setTimingMode(mode)}
                      className={`flex-1 rounded-lg py-2 items-center border-2 ${
                        timingMode === mode
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          timingMode === mode ? "text-indigo-400" : "text-slate-300"
                        }`}
                      >
                        {mode === "global" ? "Use Global Setting" : "Customize"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {timingMode === "custom" && (
                  <>
                    {recurrence !== "daily" && (
                      <>
                        <Text className="text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">
                          Notify this many days before due
                        </Text>
                        <View className="mb-3">
                          <DaysBeforeDueField value={offsets} onChange={setOffsets} />
                        </View>
                      </>
                    )}

                    <Text className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">
                      Time
                    </Text>
                    <TimeField
                      hour={hour}
                      minute={minute}
                      onChange={(h, m) => {
                        setHour(h);
                        setMinute(m);
                      }}
                    />
                  </>
                )}
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={resetAndClose}
                  className="flex-1 rounded-lg bg-slate-700/50 py-3 border border-slate-600"
                >
                  <Text className="text-center font-semibold text-slate-200 text-[14px]">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!isComplete || isSaving}
                  onPress={handleSave}
                  className={`flex-1 rounded-lg py-3 ${
                    isComplete && !isSaving
                      ? "bg-linear-to-r from-indigo-500 to-indigo-600"
                      : "bg-slate-600/30 opacity-50"
                  }`}
                >
                  <Text className="text-center font-semibold text-white text-[14px]">
                    {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Reminder"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
