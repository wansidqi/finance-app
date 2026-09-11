import { BooleanRenderer } from "@/components/BooleanRenderer";
import { calendarDateToIso, DateField, isoToCalendarDate, today } from "@/components/date-field";
import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { FieldLabel } from "@/components/ui/field-label";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TextField } from "@/components/ui/text-field";
import { SCREEN_SCROLL_BOTTOM_PADDING } from "@/constants/layout";
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
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

const CATEGORIES = ["DEBT", "COMMITMENT"];

export default function LiabilityDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: liability, isLoading } = useGetLiabilitiesById(id as string);
  const { hideAmounts, setHideAmounts } = useFormatRM();

  if (!id) return null;

  if (isLoading)
    return (
      <View className="flex-1 bg-canvas items-center justify-center">
        <Text className="font-sans text-mist">Loading...</Text>
      </View>
    );

  if (!liability)
    return (
      <View className="flex-1 bg-canvas items-center justify-center">
        <Text className="font-sans text-mist">Liability not found</Text>
      </View>
    );

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader
        variant="back"
        title="Liability Details"
        onBack={() => router.navigate("/(tabs)/liability")}
        right={
          <IconButton
            onPress={() => setHideAmounts(!hideAmounts)}
            icon={hideAmounts ? "eye-off-outline" : "eye-outline"}
            label={hideAmounts ? "Show amounts" : "Hide amounts"}
          />
        }
      />

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="px-6"
          contentContainerStyle={{ paddingBottom: SCREEN_SCROLL_BOTTOM_PADDING }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
    reminder_due_date,
    reminder_status,
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

  const [reminderEnabled, setReminderEnabled] = useState(!!reminder_due_date);
  const [reminderDate, setReminderDate] = useState<Date>(
    reminder_due_date ? isoToCalendarDate(reminder_due_date) : today(),
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
          reminder_due_date: reminderEnabled ? calendarDateToIso(reminderDate) : null,
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
    <View>
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <ConfirmDeleteModal
        title="Delete Liability"
        description="Are you sure you want to delete this liability? This action cannot be undone."
        visible={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      <Card padded={false}>
        <View className="px-6 py-6">
          {/* Category + Edit/Delete Buttons */}
          <View className="flex-row items-center justify-between mb-4">
            <BooleanRenderer
              condition={isEdit}
              editOn={
                <View className="flex-1">
                  <ChipGroup
                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                    value={(editLiability.category as string) ?? CATEGORIES[0]}
                    onChange={(v) =>
                      setEditLiability({ ...editLiability, category: v as any })
                    }
                  />
                </View>
              }
              editOff={<Badge label={String(category)} />}
            />

            <View className="flex-row">
              <IconButton
                onPress={() => setIsEdit(!isEdit)}
                icon={isEdit ? "checkmark-outline" : "pencil-outline"}
                label={isEdit ? "Save editing" : "Edit liability"}
                size={18}
                className="ml-3"
              />
              <IconButton
                onPress={() => setShowDeleteConfirm(true)}
                icon="trash-outline"
                label="Delete liability"
                size={18}
                className="ml-3"
              />
            </View>
          </View>

          {/* Name */}
          <View className="mb-4">
            <BooleanRenderer
              condition={isEdit}
              editOff={
                <Text className="font-display text-[18px] text-white">{name}</Text>
              }
              editOn={
                <TextField
                  value={editLiability.name || ""}
                  onChangeText={(text) =>
                    setEditLiability({ ...editLiability, name: text })
                  }
                  className="font-display text-[18px]"
                />
              }
            />
          </View>

          {/* Total Balance & Monthly Payment */}
          <View className="flex-row justify-between items-start mb-4 gap-2">
            {!isCommitment && (
              <View className="flex-1">
                <FieldLabel>Total Balance</FieldLabel>
                <BooleanRenderer
                  condition={isEdit}
                  editOff={
                    <Text className="font-sans text-[16px] font-bold text-white">
                      {formatRM(total_balance ?? 0)}
                    </Text>
                  }
                  editOn={
                    <TextField
                      value={totalBalanceText}
                      onChangeText={setTotalBalanceText}
                      keyboardType="decimal-pad"
                    />
                  }
                />
              </View>
            )}
            <View className="flex-1">
              <FieldLabel>Monthly Payment</FieldLabel>
              <BooleanRenderer
                condition={isEdit}
                editOff={
                  <Text className="font-sans text-[16px] font-bold text-white">
                    {formatRM(monthly_payment ?? 0)}
                  </Text>
                }
                editOn={
                  <TextField
                    value={monthlyPaymentText}
                    onChangeText={setMonthlyPaymentText}
                    keyboardType="decimal-pad"
                  />
                }
              />
            </View>
          </View>

          {/* Remaining Months & Payment Commitment */}
          {!isCommitment && remaining_month !== undefined && (
            <View className="mb-4 gap-3">
              <Card padded={false}>
                <View className="px-4 py-3.5 flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-mono text-[10px] font-semibold text-fog mb-1 uppercase tracking-widest">
                      Payment Commitment
                    </Text>
                    <Text className="font-display text-[20px] text-white">
                      {remaining_month}
                    </Text>
                    <Text className="font-sans text-[11px] text-mist mt-0.5">
                      {remaining_month === 1 ? "Month Left" : "Months Left"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Ionicons name="calendar-outline" size={28} color="#d1e4fa" />
                    <Text className="font-sans text-[10px] text-fog mt-1">
                      {Math.round((remaining_month ?? 0) / 12)} yr
                      {(remaining_month ?? 0) > 12 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          )}

          {/* Payment Reminder (optional) */}
          {(isEdit || reminder_due_date) && (
          <View className="mb-4">
            <BooleanRenderer
              condition={isEdit}
              editOff={
                reminder_due_date ? (
                  <View className="flex-row items-center gap-2 bg-luminous-fill border border-glass-edge rounded-input px-3 py-2.5">
                    <Ionicons name="notifications-outline" size={16} color="#d1e4fa" />
                    <Text className="font-sans text-[12px] font-semibold text-frost">
                      Reminder due {new Date(reminder_due_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {reminder_status === "PAUSED" ? " (paused)" : ""}
                    </Text>
                  </View>
                ) : null
              }
              editOn={
                <>
                  <FieldLabel>Payment Reminder</FieldLabel>
                  <ChipGroup
                    className="mb-2"
                    options={[
                      { value: "off", label: "No Reminder" },
                      { value: "on", label: "Remind Me" },
                    ]}
                    value={reminderEnabled ? "on" : "off"}
                    onChange={(v) => setReminderEnabled(v === "on")}
                  />
                  {reminderEnabled && (
                    <DateField value={reminderDate} onChange={setReminderDate} />
                  )}
                </>
              }
            />
          </View>
          )}

          {/* Make Payment */}
          {!isEdit && !isCommitment && (
            <>
              <View className="mt-4">
                <FieldLabel>Make Payment</FieldLabel>
                <View className="flex-row gap-2.5">
                  <TextField
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder="Amount (RM)"
                    keyboardType="decimal-pad"
                    editable={!isPaying}
                    className="flex-1"
                  />
                  <TouchableOpacity
                    onPress={() => setPaymentAmount(monthly_payment?.toString() || "0")}
                    disabled={isPaying}
                    className="bg-white/5 border border-glass-edge rounded-input px-3 py-2 justify-center"
                  >
                    <Text className="font-sans text-[11px] font-bold text-mist">
                      Reset
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                label={isPaying ? "Paying..." : "Pay Now"}
                onPress={() => handlePay(Number(paymentAmount))}
                disabled={isPaying || !Number(paymentAmount)}
                fullWidth
                className="mt-4"
              />
            </>
          )}
          {isEdit && (
            <View className="mt-5 flex-row gap-2.5">
              <Button
                label="Cancel"
                variant="outline"
                className="flex-1"
                onPress={() => setIsEdit(false)}
              />
              <Button label="Save" className="flex-1" onPress={handleSave} />
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}
