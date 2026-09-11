import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field-label";
import { IconAvatar } from "@/components/ui/icon-avatar";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";
import { TextField } from "@/components/ui/text-field";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { SCREEN_SCROLL_BOTTOM_PADDING } from "@/constants/layout";
import { useFormatRM } from "@/hooks/use-format-rm";
import { LiabilityInterface } from "@/interface/liability";
import { useGetLiabilities, useUpdateLiabilityById } from "@/services/liability";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { AddDebtModal } from "./add-liability";
import { LiabilitySkeletonLoader } from "./skeleton-loader";

export function Liability() {
  const { formatRM, hideAmounts, setHideAmounts } = useFormatRM();
  const { data = [], isLoading } = useGetLiabilities();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const { error, isVisible, hideError, showError } = useErrorModal();

  const handleAddDebt = (newItem: any) => {
    setModalVisible(false);
  };

  const totalAvgMonthlyCommitment = useMemo(
    () => data.reduce((sum, l) => sum + (l.monthly_payment ?? 0), 0),
    [data],
  );

  const totalDebtBalance = useMemo(
    () => data.reduce((sum, l) => sum + (l.total_balance ?? 0), 0),
    [data],
  );

  return (
    <View className="flex-1 bg-canvas">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <ScreenHeader
        eyebrow="Overview"
        title="My Liabilities"
        right={
          <View className="flex-row items-center gap-2">
            <IconButton
              onPress={() => setHideAmounts(!hideAmounts)}
              icon={hideAmounts ? "eye-off-outline" : "eye-outline"}
              label={hideAmounts ? "Show amounts" : "Hide amounts"}
            />
            <Button label="Add" icon="add-outline" onPress={() => setModalVisible(true)} />
          </View>
        }
      />

      <KeyboardAvoidingView behavior="padding" className="flex-1 bg-canvas">
        <ScrollView
          className="px-6 flex-1"
          contentContainerStyle={{ paddingBottom: SCREEN_SCROLL_BOTTOM_PADDING }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isLoading && data.length > 0 && (
            <Card className="mb-6" padded={false}>
              <View className="px-6 pt-7 pb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-fog">
                    Total Debt
                  </Text>
                  <IconAvatar name="trending-down-outline" size={32} />
                </View>
                <Text className="font-display text-[36px] text-white">
                  {formatRM(totalDebtBalance, { decimals: true })}
                </Text>

                <View className="h-px bg-glass-edge mt-6 mb-5" />

                <View className="flex-row justify-between">
                  <HeroStat
                    label="Monthly Commitment"
                    value={formatRM(totalAvgMonthlyCommitment, { decimals: true })}
                  />
                  <HeroStat
                    label="Active"
                    value={`${data.length}`}
                    align="right"
                  />
                </View>
              </View>
            </Card>
          )}

          {isLoading ? (
            <LiabilitySkeletonLoader />
          ) : data && data.length > 0 ? (
            <View className="mb-5">
              <SectionEyebrow label="All Liabilities" className="mb-4" />
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
            </View>
          ) : (
            <View className="mt-20 items-center justify-center">
              <Ionicons name="document-outline" size={48} color="#9da7ba" />
              <Text className="mt-4 font-sans text-[16px] font-medium text-mist">
                No liabilities yet
              </Text>
              <Text className="mt-1 font-sans text-[13px] text-fog">
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

function HeroStat({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <View style={{ alignItems: align === "right" ? "flex-end" : "flex-start" }}>
      <Text className="font-mono text-[10px] uppercase tracking-wide text-fog">
        {label}
      </Text>
      <Text className="font-sans text-[15px] font-bold text-white mt-0.5">{value}</Text>
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
  const { formatRM } = useFormatRM();
  const {
    id,
    category,
    name,
    total_balance,
    monthly_payment,
    remaining_month,
    reminder_due_date,
  } = liability;
  const remainingMonths = remaining_month ?? 0;
  // Category casing is inconsistent between create ("Commitment") and edit
  // ("COMMITMENT") flows, so compare case-insensitively.
  const isCommitment = category?.toString().toUpperCase() === "COMMITMENT";

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
    <Card>
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center justify-between active:opacity-70"
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Badge label={String(category)} />
            {reminder_due_date && (
              <Ionicons name="notifications-outline" size={12} color="#d1e4fa" />
            )}
          </View>
          <Text className="font-sans text-[16px] font-semibold text-white mb-1">
            {name}
          </Text>
          <Text className="font-sans text-[12px] text-mist">
            {isCommitment
              ? `${formatRM(monthly_payment ?? 0)}/month`
              : `${formatRM(monthly_payment ?? 0)}/month • ${remainingMonths} ${
                  remainingMonths === 1 ? "month" : "months"
                }`}
          </Text>
        </View>
        <View className="items-end gap-2 ml-4">
          <Text className="font-sans text-[16px] font-bold text-white">
            {isCommitment ? formatRM(monthly_payment ?? 0) : formatRM(total_balance ?? 0)}
          </Text>
          {!isCommitment && (
            <Badge label={remainingMonths > 0 ? `${remainingMonths}m` : "Due"} />
          )}
        </View>
      </TouchableOpacity>

      {!isCommitment && remainingMonths > 0 && (
        <View className="mt-3 pt-3 border-t border-glass-edge">
          <FieldLabel>Make Payment</FieldLabel>
          <View className="flex-row items-center gap-2">
            <TextField
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="Amount (RM)"
              keyboardType="decimal-pad"
              editable={!isPaying}
              className="flex-1"
            />
            <IconButton
              onPress={() => setPaymentAmount(monthly_payment?.toString() || "0")}
              icon="refresh-outline"
              label="Reset to monthly payment amount"
              disabled={isPaying}
            />
          </View>
          <Button
            label={isPaying ? "Paying..." : "Pay Now"}
            onPress={handlePay}
            disabled={isPaying || !Number(paymentAmount)}
            fullWidth
            className="mt-2.5"
          />
        </View>
      )}
    </Card>
  );
}
