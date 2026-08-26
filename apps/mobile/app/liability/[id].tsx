import { BooleanRenderer } from "@/components/BooleanRenderer";
import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const CATEGORIES = ["DEBT", "COMMITMENT"];

export default function LiabilityDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: liability, isLoading } = useGetLiabilitiesById(id as string);

  if (!id) return null;

  if (isLoading)
    return (
      <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center">
        <Text className="text-slate-300">Loading...</Text>
      </View>
    );

  if (!liability)
    return (
      <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center">
        <Text className="text-slate-300">Liability not found</Text>
      </View>
    );

  return (
    <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <View className="flex-row items-center justify-between px-3 py-12">
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
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
  const {
    category,
    id,
    name,
    total_balance,
    monthly_payment,
    remaining_month,
  } = liability;

  const [paymentAmount, setPaymentAmount] = useState("");
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

  const handlePay = (amount: number) => {
    console.log("Paying:", amount);
  };

  const handleSave = async () => {
    try {
      await updateLiability({
        id,
        data: editLiability,
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
          isEdit
            ? "bg-slate-700"
            : "bg-linear-to-br from-slate-700 to-slate-800"
        } px-6 py-6 border border-slate-600`}
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
                        : "bg-slate-600"
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
              className={`ml-3 p-2.5 rounded-full ${isEdit ? "bg-emerald-500/20" : "bg-slate-600/50"}`}
            >
              <Ionicons
                name={isEdit ? "checkmark" : "pencil"}
                size={18}
                color={isEdit ? "#10b981" : "#cbd5e1"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              className={`ml-3 p-2.5 rounded-full bg-slate-600/50`}
            >
              <Ionicons name="trash-bin" size={18} color="#ef4444" />
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
                className="text-[18px] font-bold text-white bg-slate-600/50 px-3 py-2 rounded-lg border border-slate-500"
              />
            }
          />
        </View>

        {/* Total Balance & Monthly Payment */}
        <View className="flex-row justify-between items-start mb-4 gap-2">
          <View className="flex-1">
            <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Total Balance
            </Text>
            <BooleanRenderer
              condition={isEdit}
              editOff={
                <Text className="text-[16px] font-bold text-rose-400">
                  RM{total_balance?.toLocaleString() || "0"}
                </Text>
              }
              editOn={
                <TextInput
                  value={editLiability.total_balance?.toString() || ""}
                  onChangeText={(text) =>
                    setEditLiability({
                      ...editLiability,
                      total_balance: Number(text) || 0,
                    })
                  }
                  keyboardType="numeric"
                  className="text-[16px] font-bold text-rose-400 bg-slate-600/50 px-3 py-2 rounded-lg border border-slate-500"
                />
              }
            />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Monthly Payment
            </Text>
            <BooleanRenderer
              condition={isEdit}
              editOff={
                <Text className="text-[16px] font-bold text-slate-100">
                  RM{monthly_payment?.toLocaleString() || "0"}
                </Text>
              }
              editOn={
                <TextInput
                  value={editLiability.monthly_payment?.toString() || ""}
                  onChangeText={(text) =>
                    setEditLiability({
                      ...editLiability,
                      monthly_payment: Number(text) || 0,
                    })
                  }
                  keyboardType="numeric"
                  className="text-[16px] font-bold text-slate-100 bg-slate-600/50 px-3 py-2 rounded-lg border border-slate-500"
                />
              }
            />
          </View>
        </View>

        {/* Remaining Months & Payment Commitment */}
        {remaining_month !== undefined && (
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
        {!isEdit && (
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
                  keyboardType="numeric"
                  className="flex-1 border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
                />
                <TouchableOpacity
                  onPress={() => {
                    setPaymentAmount(monthly_payment?.toString() || "0");
                    handlePay(monthly_payment || 0);
                  }}
                  className="bg-rose-500/20 border border-rose-500/50 rounded-lg px-3 py-2 justify-center"
                >
                  <Text className="text-[11px] font-bold text-rose-400">
                    Auto
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handlePay(Number(paymentAmount))}
              className="mt-4 bg-linear-to-r from-rose-500 to-rose-600 rounded-lg py-3 shadow-lg"
            >
              <Text className="text-center font-semibold text-white text-[13px]">
                Pay Now
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
              className="flex-1 bg-slate-600/40 rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-slate-200 text-[13px]">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className="flex-1 bg-linear-to-r from-emerald-500 to-emerald-600 rounded-lg py-3 shadow-lg"
            >
              <Text className="text-center font-semibold text-white text-[13px]">
                Save
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
