import { BooleanRenderer } from "@/components/BooleanRenderer";
import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { useFormatRM } from "@/hooks/use-format-rm";
import { LiabilityInterface } from "@/interface/liability";
import {
  useDeleteLiability,
  useGetLiabilitiesById,
  useUpdateLiabilityById,
} from "@/services/liability";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

const CATEGORIES = ["DEBT", "COMMITMENT"];

export default function LiabilityDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: liability, isLoading } = useGetLiabilitiesById(id as string);

  if (!id) return null;

  if (isLoading)
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-slate-300">Loading...</Text>
      </View>
    );

  if (!liability)
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-slate-300">Liability not found</Text>
      </View>
    );

  return (
    <View className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between px-3 pt-20 pb-6">
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)/liability")}
          className="p-2"
        >
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-[18px] font-bold text-white flex-1 ml-2">
          Liability Details
        </Text>
      </View>

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="px-6"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <LiabilityCard {...liability} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function LiabilityCard(liability: LiabilityInterface) {
  const { formatRM } = useFormatRM();
  const {
    category,
    id,
    name,
    total_balance,
    monthly_payment,
    remaining_month,
  } = liability;

  // Category casing is inconsistent between create ("Commitment") and edit
  // ("COMMITMENT") flows, so compare case-insensitively.
  const isCommitment = category?.toString().toUpperCase() === "COMMITMENT";

  const [paymentAmount, setPaymentAmount] = useState(
    monthly_payment?.toString() || "",
  );
  const [isPaying, setIsPaying] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const editAnimRef = useRef(new Animated.Value(0)).current;
  const [editLiability, setEditLiability] = useState<
    Partial<LiabilityInterface>
  >({
    category,
    name,
    total_balance,
    monthly_payment,
  });

  // Raw text, not parsed to Number, while typing — a controlled input bound
  // to a parsed numeric value snaps "10." back to "10" the instant the
  // decimal point is typed, since (10).toString() drops it. Only converted
  // to a number at save time.
  const [totalBalanceText, setTotalBalanceText] = useState(
    total_balance?.toString() ?? "",
  );
  const [monthlyPaymentText, setMonthlyPaymentText] = useState(
    monthly_payment?.toString() ?? "",
  );

  const { mutateAsync: updateLiability } = useUpdateLiabilityById(id);
  const { mutateAsync: deleteLiability } = useDeleteLiability(id);

  const { error, isVisible, hideError, showError } = useErrorModal();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    Animated.timing(editAnimRef, {
      toValue: isEdit ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isEdit]);

  const handlePay = async (amount: number) => {
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
    } catch (error: any) {
      showError(
        error?.response?.data ?? {
          message: error?.message ?? "Payment failed",
        },
      );
    } finally {
      setIsPaying(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateLiability({
        id,
        data: {
          ...editLiability,
          total_balance: totalBalanceText.trim() ? Number(totalBalanceText) : null,
          monthly_payment: monthlyPaymentText.trim() ? Number(monthlyPaymentText) : 0,
        },
      });
      setIsEdit(false);
    } catch (error: any) {
      const apiError = error?.response?.data ?? {
        message: error?.message ?? "Unknown error",
      };
      showError(apiError);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteLiability();
      setShowDeleteConfirm(false);
      // optionally navigate back after deletion
      // router.back();
    } catch (err: any) {
      showError(
        err?.response?.data ?? { message: err?.message ?? "Delete failed" },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Animated.View
      className="rounded-3xl overflow-hidden shadow-lg"
      style={{
        opacity: editAnimRef.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1],
        }),
      }}
    >
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <ConfirmDeleteModal
        title="Delete Liability"
        description="Are you sure you want to delete this liability? This action cannot be undone."
        visible={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      <View
        className={`${
          isEdit ? "bg-slate-800" : "bg-slate-900"
        } px-6 py-6 border border-white/10`}
      >
        {/* Category + Edit/Delete Buttons */}
        <View className="flex-row items-center justify-between mb-4">
          <BooleanRenderer
            condition={isEdit}
            editOn={
              <View className="flex-1 flex-row gap-2">
                {CATEGORIES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() =>
                      setEditLiability({
                        ...editLiability,
                        category: item as any,
                      })
                    }
                    className={`flex-1 rounded-lg py-2 ${
                      editLiability.category === item
                        ? "bg-rose-500"
                        : "bg-white/10"
                    }`}
                  >
                    <Text
                      className={`text-center text-[11px] font-bold capitalize ${
                        editLiability.category === item
                          ? "text-white"
                          : "text-slate-300"
                      }`}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
            editOff={
              <View className="flex-row items-center gap-2">
                <View className="bg-rose-500/20 rounded-full px-3 py-1">
                  <Text className="text-[11px] font-bold text-rose-400 capitalize">
                    {category}
                  </Text>
                </View>
              </View>
            }
          />

          <View className="flex-row">
            <TouchableOpacity
              onPress={() => setIsEdit(!isEdit)}
              className={`ml-3 p-2.5 rounded-full ${isEdit ? "bg-emerald-500/20" : "bg-white/10"}`}
            >
              <Ionicons
                name={isEdit ? "checkmark" : "pencil"}
                size={18}
                color={isEdit ? "#34d399" : "#cbd5e1"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              className={`ml-3 p-2.5 rounded-full bg-white/10`}
            >
              <Ionicons name="trash-bin" size={18} color="#fb7185" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Name */}
        <View className="mb-4">
          <BooleanRenderer
            condition={isEdit}
            editOff={
              <Text className="text-[18px] font-bold text-white">{name}</Text>
            }
            editOn={
              <TextInput
                value={editLiability.name || ""}
                onChangeText={(text) =>
                  setEditLiability({ ...editLiability, name: text })
                }
                className="text-[18px] font-bold text-white bg-white/5 px-3 py-2 rounded-lg border border-white/10"
              />
            }
          />
        </View>

        {/* Total Balance & Monthly Payment */}
        <View className="flex-row justify-between items-start mb-4 gap-2">
          {!isCommitment && (
            <View className="flex-1">
              <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Total Balance
              </Text>
              <BooleanRenderer
                condition={isEdit}
                editOff={
                  <Text className="text-[16px] font-bold text-rose-400">
                    {formatRM(total_balance ?? 0)}
                  </Text>
                }
                editOn={
                  <TextInput
                    value={totalBalanceText}
                    onChangeText={setTotalBalanceText}
                    keyboardType="decimal-pad"
                    className="text-[16px] font-bold text-rose-400 bg-white/5 px-3 py-2 rounded-lg border border-white/10"
                  />
                }
              />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Monthly Payment
            </Text>
            <BooleanRenderer
              condition={isEdit}
              editOff={
                <Text
                  className={`text-[16px] font-bold ${isCommitment ? "text-rose-400" : "text-slate-100"}`}
                >
                  {formatRM(monthly_payment ?? 0)}
                </Text>
              }
              editOn={
                <TextInput
                  value={monthlyPaymentText}
                  onChangeText={setMonthlyPaymentText}
                  keyboardType="decimal-pad"
                  className="text-[16px] font-bold text-slate-100 bg-white/5 px-3 py-2 rounded-lg border border-white/10"
                />
              }
            />
          </View>
        </View>

        {/* Remaining Months & Payment Commitment */}
        {!isCommitment && remaining_month !== undefined && (
          <View className="mb-4 gap-3">
            <View className="bg-linear-to-r from-rose-500/15 to-rose-600/15 rounded-2xl px-4 py-3.5 flex-row items-center justify-between border border-rose-500/30">
              <View className="flex-1">
                <Text className="text-[10px] font-semibold text-rose-300 mb-1 uppercase tracking-widest">
                  Payment Commitment
                </Text>
                <Text className="text-[20px] font-black text-rose-400">
                  {remaining_month}
                </Text>
                <Text className="text-[11px] text-rose-300/80 mt-0.5">
                  {remaining_month === 1 ? "Month Left" : "Months Left"}
                </Text>
              </View>
              <View className="items-end">
                <Ionicons name="calendar-outline" size={28} color="#f43f5e" />
                <Text className="text-[10px] text-rose-300/70 mt-1">
                  {Math.round((remaining_month ?? 0) / 12)} yr
                  {(remaining_month ?? 0) > 12 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Make Payment */}
        {!isEdit && !isCommitment && (
          <>
            <View className="mt-4">
              <Text className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Make Payment
              </Text>
              <View className="flex-row gap-2.5">
                <TextInput
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="Amount (RM)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  editable={!isPaying}
                  className="flex-1 border border-white/10 rounded-lg py-2 px-2.5 text-white bg-white/5 text-[12px]"
                />
                <TouchableOpacity
                  onPress={() => setPaymentAmount(monthly_payment?.toString() || "0")}
                  disabled={isPaying}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 justify-center"
                >
                  <Text className="text-[11px] font-bold text-slate-300">
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handlePay(Number(paymentAmount))}
              disabled={isPaying || !Number(paymentAmount)}
              className={`mt-4 bg-rose-500 rounded-lg py-3 ${
                isPaying || !Number(paymentAmount) ? "opacity-50" : ""
              }`}
            >
              <Text className="text-center font-semibold text-white text-[13px]">
                {isPaying ? "Paying..." : "Pay Now"}
              </Text>
            </TouchableOpacity>
          </>
        )}
        {}
        {isEdit && (
          <View className="mt-5 flex-row gap-2.5">
            <TouchableOpacity
              onPress={() => {
                setIsEdit(false);
              }}
              className="flex-1 bg-white/5 rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-slate-200 text-[13px]">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className="flex-1 bg-emerald-500 rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-emerald-950 text-[13px]">
                Save
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
