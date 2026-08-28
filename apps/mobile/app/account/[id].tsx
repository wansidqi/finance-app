import { AddAccountModal } from "@/components/accounts/add-account-modal";
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from "@/components/accounts/category";
import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal";
import { TRANSACTION_TYPE_LABELS } from "@/components/transactions/category";
import { TransactionInterface } from "@/interface/transaction";
import { isOutflowType } from "@/local/transaction-effect";
import { useDeleteAccount, useGetAccountById, useSetAccountArchived } from "@/services/account";
import { useDeleteTransaction, useGetTransactionsByAccount } from "@/services/transaction";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function AccountDetailPage() {
  const { id } = useLocalSearchParams();
  const accountId = Number(id);
  const router = useRouter();

  const { data: account, isLoading } = useGetAccountById(accountId);
  const { data: transactions = [], isLoading: isLoadingTransactions } =
    useGetTransactionsByAccount(accountId);

  const [editVisible, setEditVisible] = useState(false);
  const [addTxnVisible, setAddTxnVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState<TransactionInterface | null>(null);
  const [deletingTxnId, setDeletingTxnId] = useState<number | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const { error, isVisible, hideError, showError } = useErrorModal();
  const { mutateAsync: setArchived } = useSetAccountArchived();
  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } = useDeleteAccount();
  const { mutateAsync: deleteTransaction, isPending: isDeletingTxn } = useDeleteTransaction();

  if (!id) return null;

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-slate-300">Loading...</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-slate-300">Account not found</Text>
      </View>
    );
  }

  const handleToggleArchive = async () => {
    try {
      await setArchived({ id: account.id, archived: account.status === "ACTIVE" });
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Failed to update account" });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount(account.id);
      setShowDeleteAccount(false);
      router.replace("/(tabs)/accounts");
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Delete failed" });
    }
  };

  const handleDeleteTransaction = async () => {
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

      <View className="flex-row items-center justify-between px-3 py-12">
        <TouchableOpacity onPress={() => router.navigate("/(tabs)/accounts")} className="p-2">
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-[18px] font-bold text-white flex-1 ml-2">Account Details</Text>
        <TouchableOpacity onPress={() => setEditVisible(true)} className="p-2.5 rounded-full bg-white/10">
          <Ionicons name="pencil" size={16} color="#cbd5e1" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleArchive} className="ml-2 p-2.5 rounded-full bg-white/10">
          <Ionicons
            name={account.status === "ACTIVE" ? "archive-outline" : "arrow-undo-outline"}
            size={16}
            color="#cbd5e1"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowDeleteAccount(true)}
          className="ml-2 mr-1 p-2.5 rounded-full bg-white/10"
        >
          <Ionicons name="trash-bin" size={16} color="#fb7185" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-3xl overflow-hidden border border-white/10 bg-slate-900 px-6 py-6 mb-6">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="p-2 rounded-full bg-sky-500/15">
              <Ionicons name={ACCOUNT_TYPE_ICONS[account.type]} size={16} color="#38bdf8" />
            </View>
            <View className="bg-sky-500/20 rounded-full px-3 py-1">
              <Text className="text-[11px] font-bold text-sky-400">
                {ACCOUNT_TYPE_LABELS[account.type]}
              </Text>
            </View>
            {account.status === "ARCHIVED" && (
              <View className="bg-slate-500/20 rounded-full px-3 py-1">
                <Text className="text-[11px] font-bold text-slate-300">Archived</Text>
              </View>
            )}
          </View>

          <Text className="text-[20px] font-bold text-white mb-1">{account.name}</Text>
          {account.institution && (
            <Text className="text-[13px] text-slate-400 mb-4">{account.institution}</Text>
          )}

          <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            Balance
          </Text>
          <Text
            className={`text-[28px] font-black ${account.balance < 0 ? "text-red-400" : "text-sky-400"}`}
          >
            RM{account.balance.toLocaleString()}
          </Text>

          {account.note && <Text className="text-[12px] text-slate-500 mt-3">{account.note}</Text>}
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-[16px] font-bold text-white">Transactions</Text>
          <TouchableOpacity
            onPress={() => {
              setEditingTxn(null);
              setAddTxnVisible(true);
            }}
            className="rounded-full bg-sky-500 px-4 py-2 flex-row items-center gap-1 active:opacity-80"
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-white font-semibold text-[12px]">Add</Text>
          </TouchableOpacity>
        </View>

        {!isLoadingTransactions && transactions.length > 0 ? (
          <View className="gap-3">
            {transactions.map((txn) => (
              <TransactionListItem
                key={txn.id}
                transaction={txn}
                accountId={account.id}
                onPress={() => {
                  setEditingTxn(txn);
                  setAddTxnVisible(true);
                }}
                onDelete={() => setDeletingTxnId(txn.id)}
              />
            ))}
          </View>
        ) : (
          !isLoadingTransactions && (
            <View className="mt-10 items-center justify-center">
              <Ionicons name="receipt-outline" size={40} color="#64748b" />
              <Text className="mt-3 text-[14px] font-medium text-slate-400">No transactions yet</Text>
            </View>
          )
        )}
      </ScrollView>

      <AddAccountModal visible={editVisible} onClose={() => setEditVisible(false)} account={account} />

      <AddTransactionModal
        visible={addTxnVisible}
        onClose={() => setAddTxnVisible(false)}
        account={account}
        transaction={editingTxn}
      />

      <ConfirmDeleteModal
        visible={showDeleteAccount}
        title="Delete this account?"
        description="This can't be undone. All of its transaction history will be deleted too."
        onCancel={() => setShowDeleteAccount(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isDeletingAccount}
      />

      <ConfirmDeleteModal
        visible={deletingTxnId != null}
        title="Delete this transaction?"
        description="This can't be undone. The account balance will be adjusted back."
        onCancel={() => setDeletingTxnId(null)}
        onConfirm={handleDeleteTransaction}
        isLoading={isDeletingTxn}
      />
    </View>
  );
}

function TransactionListItem({
  transaction,
  accountId,
  onPress,
  onDelete,
}: {
  transaction: TransactionInterface;
  accountId: number;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { type, amount, occurred_at, description, note, account_id, transfer_account_name, account_name } =
    transaction;

  const isTransfer = type === "transfer";
  const isDestinationSide = isTransfer && account_id !== accountId;
  const isPositive = isDestinationSide || !isOutflowType(type);
  // Editing always writes account_id = the account whose page we're on, so
  // that's only correct when this account IS the transaction's primary
  // side — from the receiving side of a transfer, only delete is offered.
  const isEditable = account_id === accountId;

  const label =
    description ||
    (isTransfer
      ? isDestinationSide
        ? `Transfer from ${account_name}`
        : `Transfer to ${transfer_account_name}`
      : TRANSACTION_TYPE_LABELS[type]);

  const dateLabel = new Date(occurred_at).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const Row = (
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
      <Text className={`text-[16px] font-bold ml-4 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
        {isPositive ? "+" : "-"}RM{amount.toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View className="bg-white/[0.035] border border-white/10 rounded-xl px-4 py-4">
      {isEditable ? (
        <TouchableOpacity onPress={onPress} className="active:opacity-70">
          {Row}
        </TouchableOpacity>
      ) : (
        Row
      )}

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
