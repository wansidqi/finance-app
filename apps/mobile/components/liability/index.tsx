import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { LiabilityInterface } from "@/interface/liability";
import { useGetLiabilities, useUpdateLiabilityById } from "@/services/liability";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { LogPaymentPanel } from "./log-payment-panel";

export function Liability() {
  const { data = [], isLoading } = useGetLiabilities();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const { error, isVisible, hideError, showError } = useErrorModal();

  const handleAddDebt = (newItem: any) => {
    setModalVisible(false);
  };

  const totalAvgMonthlyCommitment = useMemo(
    () =>
      data.reduce(
        (sum, l) => sum + (l.average_monthly_payment ?? l.monthly_payment ?? 0),
        0,
      ),
    [data],
  );

  return (
    <View className="flex-1 bg-slate-950">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <View className="flex-row items-center justify-between px-6 pt-20 pb-6">
        <View>
          <Text className="text-[13px] font-medium text-slate-500">
            Overview
          </Text>
          <Text className="text-[30px] font-bold text-white mt-1 tracking-tight">
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

      <KeyboardAvoidingView behavior="padding" className="flex-1 bg-slate-950">
        <ScrollView
          className="px-6 flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {!isLoading && data.length > 0 && (
            <View className="mb-4 rounded-2xl bg-white/[0.035] border border-white/10 px-4 py-3.5 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Avg Monthly Commitment
                </Text>
                <Text className="text-[10px] text-slate-500 mt-0.5">
                  Across {data.length}{" "}
                  {data.length === 1 ? "liability" : "liabilities"}
                </Text>
              </View>
              <Text className="text-[20px] font-extrabold text-rose-400">
                RM{totalAvgMonthlyCommitment.toLocaleString()}
              </Text>
            </View>
          )}
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
  const {
    id,
    category,
    name,
    total_balance,
    monthly_payment,
    average_monthly_payment,
    remaining_month,
  } = liability;
  const remainingMonths = remaining_month ?? 0;
  // Category casing is inconsistent between create ("Commitment") and edit
  // ("COMMITMENT") flows, so compare case-insensitively.
  const isCommitment = category?.toString().toUpperCase() === "COMMITMENT";
  const avgPayment = average_monthly_payment ?? monthly_payment ?? 0;
  const hasVariablePayments = Math.round(avgPayment) !== Math.round(monthly_payment ?? 0);

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
            {isCommitment
              ? hasVariablePayments
                ? `RM${avgPayment.toLocaleString()}/month avg`
                : `RM${monthly_payment?.toLocaleString() || "0"}/month`
              : `RM${monthly_payment?.toLocaleString() || "0"}/month • ${remainingMonths} ${
                  remainingMonths === 1 ? "month" : "months"
                }`}
          </Text>
        </View>
        <View className="items-end gap-2 ml-4">
          <Text className="text-[16px] font-bold text-rose-400">
            {isCommitment
              ? `RM${avgPayment.toLocaleString()}`
              : `RM${total_balance?.toLocaleString() || "0"}`}
          </Text>
          {!isCommitment && (
            <View className="bg-rose-500/20 rounded-lg px-2 py-1">
              <Text className="text-[11px] font-bold text-rose-300">
                {remainingMonths > 0 ? `${remainingMonths}m` : "Due"}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {isCommitment ? (
        <LogPaymentPanel
          liabilityId={id}
          monthlyPaymentHint={monthly_payment}
          onError={onError}
        />
      ) : (
        remainingMonths > 0 && (
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
                keyboardType="decimal-pad"
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
        )
      )}
    </View>
  );
}
