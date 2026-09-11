import { calendarDateToIso, DateField, today } from "@/components/date-field";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { TextField } from "@/components/ui/text-field";
import { useCreateLiability } from "@/services/liability";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, View } from "react-native";
import { ErrorModal } from "../modal/error-modal";
import { useErrorModal } from "../modal/useErrorModal";

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

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Add Debt / Commitment"
      subtitle="Manage your financial obligations"
      footer={
        <View className="flex-row gap-3">
          <Button label="Cancel" variant="outline" onPress={onClose} className="flex-1" />
          <Button
            label="Add Obligation"
            onPress={handleSave}
            disabled={!isComplete}
            className="flex-1"
          />
        </View>
      }
    >
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      {/* Name Input */}
      <View className="mb-4">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
          Name
        </Text>
        <TextField
          placeholder="e.g., Car Loan, Credit Card"
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Category toggle */}
      <View className="mb-4">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
          Category
        </Text>
        <ChipGroup
          options={[
            { value: "Debt", label: "Debt" },
            { value: "Commitment", label: "Commitment" },
          ]}
          value={category}
          onChange={(v) => setCategory(v as "Debt" | "Commitment")}
        />
      </View>

      {category === "Debt" && (
        <View className="mb-4">
          <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
            Total Balance (RM)
          </Text>
          <TextField
            prefix="RM"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={totalBalance}
            onChangeText={setTotalBalance}
          />
        </View>
      )}

      {/* Monthly Payment Input */}
      <View className="mb-6">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
          Monthly Payment (RM)
        </Text>
        <TextField
          prefix="RM"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={monthlyPayment}
          onChangeText={setMonthlyPayment}
        />
      </View>

      {/* Payment Reminder (optional) */}
      <View className="mb-6">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
          Payment Reminder (optional)
        </Text>
        <ChipGroup
          options={[
            { value: "off", label: "No Reminder" },
            { value: "on", label: "Remind Me" },
          ]}
          value={reminderEnabled ? "on" : "off"}
          onChange={(v) => setReminderEnabled(v === "on")}
        />
        {reminderEnabled && (
          <View className="mt-3">
            <Text className="font-mono text-[10px] text-fog mb-1.5 uppercase tracking-wider">
              Due Date
            </Text>
            <DateField value={reminderDate} onChange={setReminderDate} />
          </View>
        )}
      </View>

      {/* Info Box */}
      <View className="bg-white/5 border border-glass-edge rounded-input px-3 py-3 mb-6">
        <View className="flex-row gap-2">
          <Ionicons name="information-circle-outline" size={16} color="#9da7ba" />
          <Text className="flex-1 font-sans text-[11px] text-fog">
            {category === "Debt"
              ? "Debt obligations with a specific end date"
              : "Open-ended commitments with flexible terms"}
          </Text>
        </View>
      </View>
    </BottomSheetModal>
  );
}
