import { calendarDateToIso, DateField, isoToCalendarDate, today } from "@/components/date-field";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { TimeField } from "@/components/time-field";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { TextField } from "@/components/ui/text-field";
import { ReminderInterface, ReminderRecurrence, ReminderTimingMode } from "@/interface/reminder";
import {
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
  DEFAULT_REMINDER_OFFSETS_DAYS,
} from "@/local/reminder-notification-settings-service";
import { useCreateReminder, useUpdateReminder } from "@/services/reminder";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { DaysBeforeDueField, withDueDayIncluded } from "./days-before-due-picker";
import { REMINDER_RECURRENCES, REMINDER_RECURRENCE_LABELS } from "./reminder-options";

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
    <>
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <BottomSheetModal
        visible={visible}
        onClose={resetAndClose}
        title={isEditing ? "Edit Reminder" : "Add Reminder"}
        subtitle="Anything you want to be reminded about"
        footer={
          <View className="flex-row gap-3">
            <Button label="Cancel" variant="outline" onPress={resetAndClose} className="flex-1" />
            <Button
              label={isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Reminder"}
              variant="primary"
              disabled={!isComplete || isSaving}
              onPress={handleSave}
              className="flex-1"
            />
          </View>
        }
      >
        <View className="mb-4">
          <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
            Name
          </Text>
          <TextField
            placeholder="e.g., Rent, Service Car, Visit Clinic"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="mb-4">
          <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
            Description (optional)
          </Text>
          <TextField
            placeholder="Shown here, and used as the notification's message instead of 'Due today.'"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        <View className="mb-4">
          <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
            Recurrence
          </Text>
          <ChipGroup
            options={REMINDER_RECURRENCES.map((r) => ({ value: r, label: REMINDER_RECURRENCE_LABELS[r] }))}
            value={recurrence}
            onChange={setRecurrence}
          />
        </View>

        {recurrence === "custom" && (
          <View className="mb-4">
            <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
              Repeat every (days)
            </Text>
            <TextField
              placeholder="30"
              keyboardType="number-pad"
              value={intervalDays}
              onChangeText={setIntervalDays}
            />
          </View>
        )}

        <View className="mb-4">
          <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
            {isEditing ? "Next Due Date" : "Due Date"}
          </Text>
          <DateField value={dueDate} onChange={setDueDate} />
        </View>

        <View className="mb-6">
          <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
            Notification Timing
          </Text>
          <View className="flex-row gap-2 mb-3">
            {(["global", "custom"] as ReminderTimingMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setTimingMode(mode)}
                className={`flex-1 rounded-button py-2 items-center border ${
                  timingMode === mode
                    ? "border-glass-edge bg-luminous-fill"
                    : "border-white/[0.06] bg-transparent"
                }`}
              >
                <Text
                  className={`font-sans text-[11px] font-bold ${
                    timingMode === mode ? "text-white" : "text-mist"
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
                  <Text className="font-mono text-[10px] text-fog mb-1.5 uppercase tracking-wider">
                    Notify this many days before due
                  </Text>
                  <View className="mb-3">
                    <DaysBeforeDueField value={offsets} onChange={setOffsets} />
                  </View>
                </>
              )}

              <Text className="font-mono text-[10px] text-fog mb-1 uppercase tracking-wider">
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
      </BottomSheetModal>
    </>
  );
}
