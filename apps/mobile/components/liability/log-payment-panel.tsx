import {
  useAddLiabilityPayment,
  useDeleteLiabilityPayment,
  useGetLiabilityPayments,
} from "@/services/liability";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  liabilityId: number;
  monthlyPaymentHint: number;
  onError: (error: any) => void;
  // Caps how many recent payments are listed — the list screen keeps this
  // small, the detail screen can afford to show more.
  historyLimit?: number;
};

// Shared between the liability list item and the liability detail page —
// lets a "commitment" liability (e.g. a Shopee PayLater plan) whose payment
// amount changes month to month log what was actually paid instead of
// forcing a single fixed monthly_payment.
export function LogPaymentPanel({
  liabilityId,
  monthlyPaymentHint,
  onError,
  historyLimit = 3,
}: Props) {
  const [amount, setAmount] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const { data: payments } = useGetLiabilityPayments(liabilityId);
  const { mutateAsync: addPayment } = useAddLiabilityPayment(liabilityId);
  const { mutateAsync: removePayment } = useDeleteLiabilityPayment(liabilityId);

  const handleLog = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return;

    try {
      setIsLogging(true);
      await addPayment({ amount: value });
      setAmount("");
    } catch (err: any) {
      onError(
        err?.response?.data ?? { message: err?.message ?? "Failed to log payment" },
      );
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View className="mt-3 pt-3 border-t border-white/10">
      <Text className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
        Log This Month&apos;s Payment
      </Text>
      <View className="flex-row gap-2.5">
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder={`e.g., ${monthlyPaymentHint || "0"}`}
          placeholderTextColor="#64748b"
          keyboardType="decimal-pad"
          editable={!isLogging}
          className="flex-1 border border-white/10 rounded-lg py-2 px-2.5 text-white bg-white/5 text-[12px]"
        />
        <TouchableOpacity
          onPress={handleLog}
          disabled={isLogging || !Number(amount)}
          className={`bg-rose-500 rounded-lg px-4 py-2 justify-center ${
            isLogging || !Number(amount) ? "opacity-50" : ""
          }`}
        >
          <Text className="text-[12px] font-bold text-white">
            {isLogging ? "Logging..." : "Log"}
          </Text>
        </TouchableOpacity>
      </View>

      {payments && payments.length > 0 && (
        <View className="mt-3 gap-1.5">
          {payments.slice(0, historyLimit).map((p) => (
            <View
              key={p.id}
              className="flex-row items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2"
            >
              <Text className="text-[11px] text-slate-400">
                {new Date(p.paid_date).toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
              <View className="flex-row items-center gap-2.5">
                <Text className="text-[12px] font-semibold text-slate-200">
                  RM{p.amount.toLocaleString()}
                </Text>
                <TouchableOpacity
                  onPress={() => removePayment(p.id)}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={15} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
