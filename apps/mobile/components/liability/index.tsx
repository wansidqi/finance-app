import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { LiabilityInterface } from "@/interface/liability";
import { useGetLiabilities, useUpdateLiabilityById } from "@/services/liability";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { AddDebtModal } from "./add-liability";
import { LiabilitySkeletonLoader } from "./skeleton-loader";

export function Liability() {
  const { data = [], isLoading } = useGetLiabilities();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const { error, isVisible, hideError, showError } = useErrorModal();

  const handleAddDebt = (newItem: any) => {
    setModalVisible(false);
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <View className="flex-row items-center justify-between px-6 pt-10 pb-2">
        <View>
          <Text className="text-[14px] font-medium text-slate-400">
            Overview
          </Text>
          <Text className="text-[32px] font-bold text-white mt-1">
            My Liabilities
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="rounded-full bg-rose-500 px-5 py-3 active:opacity-80"
        >
          <View className="flex-row items-center gap-1">
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-semibold text-[14px]">Add</Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior="padding" className="flex-1 bg-slate-950 py-10 my-5">
        <ScrollView
          className="px-6 flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <LiabilitySkeletonLoader />
          ) : data && data.length > 0 ? (
            <View className="gap-3">
              {data.map((liability) => (
                <LiabilityListItem
                  key={liability.id}
                  liability={liability}
                  onPress={() =>
                    router.push({
                      pathname: "/liability/[id]",
                      params: { id: String(liability.id) },
                    })
                  }
                  onError={showError}
                />
              ))}
            </View>
          ) : (
            <View className="mt-20 items-center justify-center">
              <Ionicons name="document-outline" size={48} color="#64748b" />
              <Text className="mt-4 text-[16px] font-medium text-slate-400">
                No liabilities yet
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                Add your first liability to get started
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AddDebtModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddDebt}
      />
    </View>
  );
}

function LiabilityListItem({
  liability,
  onPress,
  onError,
}: {
  liability: LiabilityInterface;
  onPress: () => void;
  onError: (error: any) => void;
}) {
  const { id, category, name, total_balance, monthly_payment, remaining_month } =
    liability;
  const remainingMonths = remaining_month ?? 0;

  const [paymentAmount, setPaymentAmount] = useState(
    monthly_payment?.toString() || "",
  );
  const [isPaying, setIsPaying] = useState(false);
  const { mutateAsync: updateLiability } = useUpdateLiabilityById(id);

  const handlePay = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;

    const currentBalance = total_balance ?? 0;
    const newBalance = Math.max(0, currentBalance - amount);

    try {
      setIsPaying(true);
      await updateLiability({
        id,
        data: {
          total_balance: newBalance,
          ...(newBalance === 0 ? { status: "INACTIVE" } : {}),
        },
      });
      setPaymentAmount(monthly_payment?.toString() || "");
    } catch (err: any) {
      onError(
        err?.response?.data ?? { message: err?.message ?? "Payment failed" },
      );
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <View className="bg-white/[0.035] border border-white/10 rounded-xl px-4 py-4">
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center justify-between active:opacity-70"
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <View className="bg-rose-500/20 rounded-full px-2.5 py-0.5">
              <Text className="text-[10px] font-bold text-rose-400">
                {category}
              </Text>
            </View>
          </View>
          <Text className="text-[16px] font-semibold text-white mb-1">
            {name}
          </Text>
          <Text className="text-[12px] text-slate-400">
            RM{monthly_payment?.toLocaleString() || "0"}/month •{" "}
            {remainingMonths} {remainingMonths === 1 ? "month" : "months"}
          </Text>
        </View>
        <View className="items-end gap-2 ml-4">
          <Text className="text-[16px] font-bold text-rose-400">
            RM{total_balance?.toLocaleString() || "0"}
          </Text>
          <View className="bg-rose-500/20 rounded-lg px-2 py-1">
            <Text className="text-[11px] font-bold text-rose-300">
              {remainingMonths > 0 ? `${remainingMonths}m` : "Due"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {remainingMonths > 0 && (
        <View className="mt-3 pt-3 border-t border-white/10">
          <Text className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Make Payment
          </Text>
          <View className="flex-row gap-2.5">
            <TextInput
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="Amount (RM)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              editable={!isPaying}
              className="flex-1 border border-white/10 rounded-lg py-2 px-2.5 text-white bg-white/5 text-[12px]"
            />
            <TouchableOpacity
              onPress={() =>
                setPaymentAmount(monthly_payment?.toString() || "0")
              }
              disabled={isPaying}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 justify-center"
            >
              <Text className="text-[11px] font-bold text-slate-300">
                Reset
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handlePay}
            disabled={isPaying || !Number(paymentAmount)}
            className={`mt-2.5 bg-rose-500 rounded-lg py-2.5 ${
              isPaying || !Number(paymentAmount) ? "opacity-50" : ""
            }`}
          >
            <Text className="text-center font-semibold text-white text-[13px]">
              {isPaying ? "Paying..." : "Pay Now"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
