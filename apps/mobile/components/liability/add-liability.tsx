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
  const { mutateAsync } = useCreateLiability();
  const { error, isVisible, hideError, showError } = useErrorModal();

  const handleSave = async () => {
    const data = {
      name,
      category: category as "debt" | "commitment" | undefined,
      monthly_payment: Number(monthlyPayment),
      total_balance: totalBalance ? Number(totalBalance) : null,
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
  };

  const isComplete = name && (category === "Commitment" || totalBalance);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4 max-h-[90%]">
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
                        keyboardType="numeric"
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
                    keyboardType="numeric"
                    value={monthlyPayment}
                    onChangeText={setMonthlyPayment}
                    placeholderTextColor="#64748b"
                    className="flex-1 text-[13px] text-white"
                  />
                </View>
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
