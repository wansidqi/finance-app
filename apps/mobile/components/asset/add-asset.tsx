import { useCreateAsset } from "@/services/asset";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ErrorModal } from "../modal/error-modal";
import { useErrorModal } from "../modal/useErrorModal";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const CATEGORIES = ["CASH", "GOLD", "CRYPTO", "STOCK"] as const;

export function AddAssetModal({ visible, onClose }: Props) {
  const [category, setCategory] = useState<
    "CASH" | "GOLD" | "CRYPTO" | "STOCK"
  >("CASH");
  const [name, setName] = useState("");
  const [valueMode, setValueMode] = useState<"quantity" | "price">("quantity");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [goal, setGoal] = useState("");
  const { error, isVisible, hideError, showError } = useErrorModal();

  const { mutateAsync } = useCreateAsset();

  const handleSave = async () => {
    const valueNum = value ? Number(value) : null;
    const goalNum = goal ? Number(goal) : 0;

    const data = {
      category,
      name,
      quantity: valueMode === "quantity" ? valueNum : null,
      price: valueMode === "price" ? valueNum : null,
      unit: unit || "",
      goal: goalNum,
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

    // Reset form
    setCategory("CASH");
    setName("");
    setValueMode("quantity");
    setValue("");
    setUnit("");
    setGoal("");
  };

  const disabled = !name || !value || !unit;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4 max-h-[90%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="text-[20px] font-bold text-white">
                  New Asset
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Add a new investment to track
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
              contentContainerStyle={{ paddingBottom: 10 }}
              className="px-6"
            >
              {/* Category Selector */}
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-3 uppercase tracking-wider">
                  Asset Category
                </Text>

                <View className="flex-row gap-2.5">
                  {CATEGORIES.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setCategory(item)}
                      className={`flex-1 rounded-lg py-2.5 border-2 ${
                        category === item
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <View className="items-center">
                        <Ionicons
                          name={
                            item === "CASH"
                              ? "cash"
                              : item === "GOLD"
                                ? "diamond"
                                : item === "CRYPTO"
                                  ? "logo-bitcoin"
                                  : "trending-up"
                          }
                          size={20}
                          color={category === item ? "#10b981" : "#94a3b8"}
                        />
                        <Text
                          className={`text-[11px] font-bold mt-1.5 ${
                            category === item
                              ? "text-emerald-400"
                              : "text-slate-300"
                          }`}
                        >
                          {item}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Asset Name */}
              <View className="mb-3">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Asset Name
                </Text>
                <TextInput
                  placeholder="e.g., Apple Stock, Bitcoin"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              {/* Value Mode Selector */}
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  What are you measuring?
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setValueMode("quantity")}
                    className={`flex-1 rounded-lg py-2 px-3 border-2 ${
                      valueMode === "quantity"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-600 bg-slate-700/30"
                    }`}
                  >
                    <Text
                      className={`text-center text-[12px] font-semibold ${
                        valueMode === "quantity"
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }`}
                    >
                      Quantity
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setValueMode("price")}
                    className={`flex-1 rounded-lg py-2 px-3 border-2 ${
                      valueMode === "price"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-600 bg-slate-700/30"
                    }`}
                  >
                    <Text
                      className={`text-center text-[12px] font-semibold ${
                        valueMode === "price"
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }`}
                    >
                      Price
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dynamic Value Input */}
              <View className="mb-3 flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    {valueMode === "quantity" ? "Quantity" : "Price"}
                  </Text>
                  <TextInput
                    placeholder={
                      valueMode === "quantity" ? "e.g., 100" : "0.00"
                    }
                    keyboardType="decimal-pad"
                    value={value}
                    onChangeText={setValue}
                    placeholderTextColor="#64748b"
                    className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Unit
                  </Text>
                  <TextInput
                    placeholder={
                      valueMode === "quantity"
                        ? "e.g., shares, gram"
                        : "e.g., RM, USD"
                    }
                    value={unit}
                    onChangeText={setUnit}
                    placeholderTextColor="#64748b"
                    className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                  />
                </View>
              </View>

              {/* Goal (Optional) */}
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Goal Amount (Optional)
                </Text>
                <TextInput
                  placeholder="Target amount to reach"
                  keyboardType="numeric"
                  value={goal}
                  onChangeText={setGoal}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                />
                <Text className="text-[10px] text-slate-400 mt-1.5">
                  Leave empty if you don't have a specific goal
                </Text>
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
                  disabled={disabled}
                  onPress={handleSave}
                  className={`flex-1 rounded-lg py-3 ${
                    disabled
                      ? "bg-slate-600/30 opacity-50"
                      : "bg-linear-to-r from-emerald-500 to-emerald-600 shadow-lg"
                  }`}
                >
                  <Text className="text-center font-semibold text-white text-[14px]">
                    Create Asset
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
