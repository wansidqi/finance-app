import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal";
import { TRANSACTION_TYPE_LABELS } from "@/components/transactions/category";
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
  const { formatRM, hideAmounts } = useFormatRM();
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
    <View className="flex-1 bg-slate-950">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <View className="flex-row items-start justify-between px-6 pt-20 pb-6">
        <View>
          <Text className="text-[13px] font-medium text-slate-500">
            Overview
          </Text>
          <Text className="text-[30px] font-bold text-white mt-1 tracking-tight">
            Transactions
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push("/tax-relief")}
            className="p-2 rounded-full bg-white/5 active:opacity-70"
          >
            <Ionicons name="document-text-outline" size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setEditingTxn(null);
              setAddVisible(true);
            }}
            className="rounded-full bg-sky-500 px-5 py-3 active:opacity-80"
          >
            <View className="flex-row items-center gap-1">
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold text-[14px]">Add</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && transactions.length > 0 && (
          <View className="mb-6 rounded-[28px] bg-white/[0.035] border border-white/10 px-6 pt-7 pb-6 overflow-hidden">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-[1.5px]">
                Net Flow
              </Text>
              <View className="h-8 w-8 rounded-full bg-sky-500/15 items-center justify-center">
                <Ionicons name="swap-vertical" size={15} color="#38bdf8" />
              </View>
            </View>
            <Text
              className={`text-[36px] font-extrabold tracking-tight ${
                netFlow >= 0 || hideAmounts ? "text-white" : "text-rose-400"
              }`}
            >
              {netFlow < 0 && !hideAmounts ? "-" : ""}
              {formatRM(Math.abs(netFlow), { decimals: true })}
            </Text>

            <View className="h-px bg-white/8 mt-6 mb-5" />

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
        )}

        {!isLoading && transactions.length > 0 ? (
          <Section title="All Transactions">
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
          </Section>
        ) : (
          !isLoading && (
            <View className="mt-16 items-center justify-center">
              <Ionicons name="receipt-outline" size={40} color="#64748b" />
              <Text className="mt-3 text-[14px] font-medium text-slate-400">No transactions yet</Text>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-[13px] font-bold text-slate-300 mb-3 uppercase tracking-wide">
        {title}
      </Text>
      {children}
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
      <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </Text>
      <Text className="text-[15px] font-bold text-white mt-0.5">{value}</Text>
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
    <View className="bg-white/[0.035] border border-white/10 rounded-xl px-4 py-4">
      <TouchableOpacity onPress={onPress} className="active:opacity-70">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="bg-sky-500/20 rounded-full px-2.5 py-0.5">
                <Text className="text-[10px] font-bold text-sky-400">{TRANSACTION_TYPE_LABELS[type]}</Text>
              </View>
            </View>
            <Text className="text-[15px] font-semibold text-white mb-1">{label}</Text>
            <Text className="text-[12px] text-slate-400">{dateLabel}</Text>
            {note && <Text className="text-[11px] text-slate-500 mt-1">{note}</Text>}
          </View>
          <Text className="text-[16px] font-bold ml-4 text-white">{formatRM(amount)}</Text>
        </View>
      </TouchableOpacity>

      <View className="mt-3 pt-3 border-t border-white/10 flex-row justify-end">
        <TouchableOpacity
          onPress={onDelete}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={16} color="#f87171" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
