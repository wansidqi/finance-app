import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { ReminderCategory, ReminderInterface, ReminderRecurrence } from "@/interface/reminder";
import { useCreateReminder, useUpdateReminder } from "@/services/reminder";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  REMINDER_CATEGORIES,
  REMINDER_CATEGORY_LABELS,
  REMINDER_RECURRENCES,
  REMINDER_RECURRENCE_LABELS,
} from "./category";
import { DateFields, dateToFields, fieldsToIsoDate } from "./date-fields";

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
  const [category, setCategory] = useState<ReminderCategory>("other");
  const [amount, setAmount] = useState("");
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>("monthly");
  const [intervalDays, setIntervalDays] = useState("30");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [note, setNote] = useState("");

  const { mutateAsync: createReminder, isPending: isCreating } = useCreateReminder();
  const { mutateAsync: updateReminder, isPending: isUpdating } = useUpdateReminder();
  const { error, isVisible, hideError, showError } = useErrorModal();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;

    const base = reminder ? new Date(reminder.next_due_date) : new Date();
    const fields = dateToFields(base);
    setDay(fields.day);
    setMonth(fields.month);
    setYear(fields.year);

    setName(reminder?.name ?? "");
    setCategory(reminder?.category ?? "other");
    setAmount(reminder ? String(reminder.amount) : "");
    setRecurrence(reminder?.recurrence ?? "monthly");
    setIntervalDays(reminder?.recurrence_interval_days?.toString() ?? "30");
    setNote(reminder?.note ?? "");
  }, [visible, reminder]);

  const resetAndClose = () => {
    onClose();
  };

  const handleSave = async () => {
    const isoDate = fieldsToIsoDate(day, month, year);
    if (!name.trim() || !isoDate) return;

    const data: Partial<ReminderInterface> = {
      name: name.trim(),
      category,
      amount: Number(amount) || 0,
      recurrence,
      recurrence_interval_days: recurrence === "custom" ? Number(intervalDays) || 30 : null,
      next_due_date: isoDate,
      note: note.trim() || null,
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
  const isoPreview = fieldsToIsoDate(day, month, year);
  const isComplete = !!name.trim() && !!amount && !!isoPreview;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4 max-h-[90%]"
            style={{ marginBottom: TAB_BAR_BASE_HEIGHT + insets.bottom }}
          >
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="text-[20px] font-bold text-white">
                  {isEditing ? "Edit Reminder" : "Add Reminder"}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Track a recurring or one-time payment
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
            >
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Name
                </Text>
                <TextInput
                  placeholder="e.g., Rent, Car Insurance, Netflix"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Category
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {REMINDER_CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setCategory(c)}
                      className={`rounded-lg px-3 py-2 border-2 ${
                        category === c
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <Text
                        className={`font-bold text-[12px] ${
                          category === c ? "text-amber-400" : "text-slate-300"
                        }`}
                      >
                        {REMINDER_CATEGORY_LABELS[c]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Amount (RM)
                </Text>
                <View className="flex-row items-center border border-slate-600 rounded-lg bg-slate-700/30 px-3 py-3">
                  <Text className="text-slate-400 mr-2">RM</Text>
                  <TextInput
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    placeholderTextColor="#64748b"
                    className="flex-1 text-[13px] text-white"
                  />
                </View>
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
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <Text
                        className={`font-bold text-[12px] ${
                          recurrence === r ? "text-amber-400" : "text-slate-300"
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
                <DateFields
                  day={day}
                  month={month}
                  year={year}
                  onChangeDay={setDay}
                  onChangeMonth={setMonth}
                  onChangeYear={setYear}
                />
              </View>

              <View className="mb-6">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Note (optional)
                </Text>
                <TextInput
                  placeholder="Any extra detail"
                  value={note}
                  onChangeText={setNote}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
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
                      ? "bg-linear-to-r from-amber-500 to-amber-600"
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
