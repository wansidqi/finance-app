import { calendarDateToIso, DateField, today } from "@/components/date-field";
import { useCreateLiability } from "@/services/liability";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorModal } from "../modal/error-modal";
import { useErrorModal } from "../modal/useErrorModal";

// Matches the floating tab bar height in app/(tabs)/_layout.tsx, so the
// sheet's bottom row of buttons doesn't sit underneath it.
const TAB_BAR_BASE_HEIGHT = 52;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (item: any) => void;
};

export function AddDebtModal({ visible, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Debt" | "Commitment">("Debt");
  const [totalBalance, setTotalBalance] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>(today());
  const { mutateAsync } = useCreateLiability();
  const { error, isVisible, hideError, showError } = useErrorModal();

  const handleSave = async () => {
    const data = {
      name,
      category: category as "debt" | "commitment" | undefined,
      monthly_payment: Number(monthlyPayment),
      total_balance: totalBalance ? Number(totalBalance) : null,
      reminder_due_date: reminderEnabled ? calendarDateToIso(reminderDate) : undefined,
    };

    try {
      await mutateAsync(data);
      onClose();
    } catch (error: any) {
      const apiError = error?.response?.data ?? {
        message: error?.message ?? "Unknown error",
      };
      showError(apiError);
    }

    setName("");
    setCategory("Debt");
    setTotalBalance("");
    setMonthlyPayment("");
    setReminderEnabled(false);
    setReminderDate(today());
  };

  const isComplete = name && (category === "Commitment" || totalBalance);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4 max-h-[90%]"
            style={{ marginBottom: TAB_BAR_BASE_HEIGHT + insets.bottom }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="text-[20px] font-bold text-white">
                  Add Debt / Commitment
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Manage your financial obligations
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 rounded-full bg-slate-700/50"
              >
                <Ionicons name="close" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              className="px-6"
              keyboardShouldPersistTaps="handled"
            >
              {/* Name Input */}
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Name
                </Text>
                <TextInput
                  placeholder="e.g., Car Loan, Credit Card"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              {/* Category toggle */}
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Category
                </Text>
                <View className="flex-row gap-2">
                  {["Debt", "Commitment"].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setCategory(type as any)}
                      className={`flex-1 rounded-lg py-3 border-2 ${
                        category === type
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <Text
                        className={`text-center font-bold text-[13px] ${
                          category === type
                            ? "text-emerald-400"
                            : "text-slate-300"
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {category === "Debt" && (
                <>
                  {/* Total Balance Input */}
                  <View className="mb-4">
                    <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                      Total Balance (RM)
                    </Text>
                    <View className="flex-row items-center border border-slate-600 rounded-lg bg-slate-700/30 px-3 py-3">
                      <Text className="text-slate-400 mr-2">RM</Text>
                      <TextInput
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        value={totalBalance}
                        onChangeText={setTotalBalance}
                        placeholderTextColor="#64748b"
                        className="flex-1 text-[13px] text-white"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Monthly Payment Input */}
              <View className="mb-6">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Monthly Payment (RM)
                </Text>
                <View className="flex-row items-center border border-slate-600 rounded-lg bg-slate-700/30 px-3 py-3">
                  <Text className="text-slate-400 mr-2">RM</Text>
                  <TextInput
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={monthlyPayment}
                    onChangeText={setMonthlyPayment}
                    placeholderTextColor="#64748b"
                    className="flex-1 text-[13px] text-white"
                  />
                </View>
              </View>

              {/* Payment Reminder (optional) */}
              <View className="mb-6">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Payment Reminder (optional)
                </Text>
                <View className="flex-row gap-2">
                  {[
                    { label: "No Reminder", value: false },
                    { label: "Remind Me", value: true },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => setReminderEnabled(opt.value)}
                      className={`flex-1 rounded-lg py-3 items-center border-2 ${
                        reminderEnabled === opt.value
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <Text
                        className={`font-bold text-[13px] ${
                          reminderEnabled === opt.value ? "text-indigo-400" : "text-slate-300"
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {reminderEnabled && (
                  <View className="mt-3">
                    <Text className="text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">
                      Due Date
                    </Text>
                    <DateField value={reminderDate} onChange={setReminderDate} accentColor="#6366f1" />
                  </View>
                )}
              </View>

              {/* Info Box */}
              <View className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-3 mb-6">
                <View className="flex-row gap-2">
                  <Ionicons
                    name="information-circle"
                    size={16}
                    color="#64748b"
                  />
                  <Text className="flex-1 text-[11px] text-slate-400">
                    {category === "Debt"
                      ? "Debt obligations with a specific end date"
                      : "Open-ended commitments with flexible terms"}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 rounded-lg bg-slate-700/50 py-3 border border-slate-600"
                >
                  <Text className="text-center font-semibold text-slate-200 text-[14px]">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!isComplete}
                  onPress={handleSave}
                  className={`flex-1 rounded-lg py-3 ${
                    isComplete
                      ? "bg-linear-to-r from-emerald-500 to-emerald-600"
                      : "bg-slate-600/30 opacity-50"
                  }`}
                >
                  <Text className="text-center font-semibold text-white text-[14px]">
                    Add Obligation
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
