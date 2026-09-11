import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal";
import { TRANSACTION_TYPE_LABELS } from "@/components/transactions/category";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconAvatar } from "@/components/ui/icon-avatar";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";
import { SCREEN_SCROLL_BOTTOM_PADDING } from "@/constants/layout";
import { useFormatRM } from "@/hooks/use-format-rm";
import { TransactionInterface, TransactionType } from "@/interface/transaction";
import { useDeleteTransaction, useGetTransactions } from "@/services/transaction";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const INFLOW_TYPES: TransactionType[] = ["income", "dividend", "interest", "investment_sale"];

export function Transactions() {
  const router = useRouter();
  const { formatRM, hideAmounts, setHideAmounts } = useFormatRM();
  const { data: transactions = [], isLoading } = useGetTransactions();

  const [addVisible, setAddVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState<TransactionInterface | null>(null);
  const [deletingTxnId, setDeletingTxnId] = useState<number | null>(null);

  const { error, isVisible, hideError, showError } = useErrorModal();
  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useDeleteTransaction();

  const { totalIn, totalOut, thisMonthCount } = useMemo(() => {
    const now = new Date();
    let inSum = 0;
    let outSum = 0;
    let monthCount = 0;
    for (const t of transactions) {
      if (INFLOW_TYPES.includes(t.type)) inSum += t.amount;
      else outSum += t.amount;

      const occurred = new Date(t.occurred_at);
      if (
        occurred.getFullYear() === now.getFullYear() &&
        occurred.getMonth() === now.getMonth()
      ) {
        monthCount += 1;
      }
    }
    return { totalIn: inSum, totalOut: outSum, thisMonthCount: monthCount };
  }, [transactions]);

  const netFlow = totalIn - totalOut;

  const handleDelete = async () => {
    if (deletingTxnId == null) return;
    try {
      await deleteTransaction(deletingTxnId);
      setDeletingTxnId(null);
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Failed to delete transaction" });
    }
  };

  return (
    <View className="flex-1 bg-canvas">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <ScreenHeader
        eyebrow="Overview"
        title="Transactions"
        right={
          <View className="flex-row items-center gap-2">
            <IconButton
              onPress={() => setHideAmounts(!hideAmounts)}
              icon={hideAmounts ? "eye-off-outline" : "eye-outline"}
              label={hideAmounts ? "Show amounts" : "Hide amounts"}
            />
            <IconButton
              onPress={() => router.push("/tax-relief")}
              icon="document-text-outline"
              label="Tax relief"
            />
            <Button
              label="Add"
              icon="add"
              onPress={() => {
                setEditingTxn(null);
                setAddVisible(true);
              }}
            />
          </View>
        }
      />

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: SCREEN_SCROLL_BOTTOM_PADDING }}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && transactions.length > 0 && (
          <Card className="mb-6" padded={false}>
            <View className="px-6 pt-7 pb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-fog">
                  Net Flow
                </Text>
                <IconAvatar name="swap-vertical-outline" size={32} />
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="font-display text-[36px] text-white">
                  {netFlow < 0 && !hideAmounts ? "-" : ""}
                  {formatRM(Math.abs(netFlow), { decimals: true })}
                </Text>
                {netFlow < 0 && !hideAmounts && (
                  <Ionicons name="trending-down-outline" size={20} color="#9da7ba" />
                )}
              </View>

              <View className="h-px bg-glass-edge mt-6 mb-5" />

              <View className="flex-row justify-between mb-4">
                <HeroStat label="Total In" value={formatRM(totalIn, { decimals: true })} />
                <HeroStat
                  label="Total Out"
                  value={formatRM(totalOut, { decimals: true })}
                  align="right"
                />
              </View>
              <View className="flex-row justify-between">
                <HeroStat label="Transactions" value={`${transactions.length}`} />
                <HeroStat label="This Month" value={`${thisMonthCount}`} align="right" />
              </View>
            </View>
          </Card>
        )}

        {!isLoading && transactions.length > 0 ? (
          <View className="mb-5">
            <SectionEyebrow label="All Transactions" className="mb-4" />
            <View className="gap-3">
              {transactions.map((txn) => (
                <TransactionListItem
                  key={txn.id}
                  transaction={txn}
                  onPress={() => {
                    setEditingTxn(txn);
                    setAddVisible(true);
                  }}
                  onDelete={() => setDeletingTxnId(txn.id)}
                />
              ))}
            </View>
          </View>
        ) : (
          !isLoading && (
            <View className="mt-16 items-center justify-center">
              <Ionicons name="receipt-outline" size={40} color="#9da7ba" />
              <Text className="mt-3 font-sans text-[14px] font-medium text-mist">No transactions yet</Text>
            </View>
          )
        )}
      </ScrollView>

      <AddTransactionModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        transaction={editingTxn}
      />

      <ConfirmDeleteModal
        visible={deletingTxnId != null}
        title="Delete this transaction?"
        description="This can't be undone, and any attached receipts will be deleted too."
        onCancel={() => setDeletingTxnId(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
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

function TransactionListItem({
  transaction,
  onPress,
  onDelete,
}: {
  transaction: TransactionInterface;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { formatRM } = useFormatRM();
  const { type, amount, occurred_at, description, note } = transaction;
  const label = description || TRANSACTION_TYPE_LABELS[type];
  const dateLabel = new Date(occurred_at).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card>
      <TouchableOpacity onPress={onPress} className="active:opacity-70">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Badge label={TRANSACTION_TYPE_LABELS[type]} className="mb-1" />
            <Text className="font-sans text-[15px] font-semibold text-white mb-1">{label}</Text>
            <Text className="font-sans text-[12px] text-mist">{dateLabel}</Text>
            {note && <Text className="font-sans text-[11px] text-fog mt-1">{note}</Text>}
          </View>
          <Text className="font-sans text-[16px] font-bold ml-4 text-white">{formatRM(amount)}</Text>
        </View>
      </TouchableOpacity>

      <View className="mt-3 pt-3 border-t border-glass-edge flex-row justify-end">
        <TouchableOpacity
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete transaction"
          className="bg-white/5 border border-glass-edge rounded-input px-3 py-2 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={16} color="#d1e4fa" />
        </TouchableOpacity>
      </View>
    </Card>
  );
}
