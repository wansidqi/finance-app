import { dateToFields, DateFields, fieldsToIsoDate } from "@/components/reminders/date-fields";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { ReceiptsSection } from "@/components/transactions/receipts-section";
import { TaxReliefPicker } from "@/components/transactions/tax-relief-picker";
import { AccountInterface } from "@/interface/account";
import { TaxReliefCategoryKey } from "@/interface/tax-relief";
import { TransactionInterface, TransactionType } from "@/interface/transaction";
import { isOutflowType } from "@/local/transaction-effect";
import { useGetAccounts } from "@/services/account";
import { useCreateTransaction, useUpdateTransaction } from "@/services/transaction";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from "./category";

// Matches the floating tab bar height in app/(tabs)/_layout.tsx, so the
// sheet's bottom row of buttons doesn't sit underneath it.
const TAB_BAR_BASE_HEIGHT = 52;

type Props = {
  visible: boolean;
  onClose: () => void;
  account: AccountInterface;
  transaction?: TransactionInterface | null;
};

export function AddTransactionModal({ visible, onClose, account, transaction }: Props) {
  const isEditing = !!transaction;

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [transferAccountId, setTransferAccountId] = useState<number | null>(null);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [occurredYear, setOccurredYear] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [taxReliefCategory, setTaxReliefCategory] = useState<TaxReliefCategoryKey | null>(null);
  const [assessmentYear, setAssessmentYear] = useState("");

  const { data: accounts = [] } = useGetAccounts();
  const { mutateAsync: createTransaction, isPending: isCreating } = useCreateTransaction();
  const { mutateAsync: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { error, isVisible, hideError, showError } = useErrorModal();
  const insets = useSafeAreaInsets();

  const transferTargets = useMemo(
    () => accounts.filter((a) => a.id !== account.id && a.status === "ACTIVE"),
    [accounts, account.id],
  );

  useEffect(() => {
    if (!visible) return;

    const base = transaction ? new Date(transaction.occurred_at) : new Date();
    const fields = dateToFields(base);
    setDay(fields.day);
    setMonth(fields.month);
    setOccurredYear(fields.year);

    setType(transaction?.type ?? "expense");
    setAmount(transaction ? String(transaction.amount) : "");
    setTransferAccountId(transaction?.transfer_account_id ?? transferTargets[0]?.id ?? null);
    setDescription(transaction?.description ?? "");
    setNote(transaction?.note ?? "");
    setTaxReliefCategory((transaction?.tax_relief_category as TaxReliefCategoryKey | null) ?? null);
    setAssessmentYear(transaction?.assessment_year ? String(transaction.assessment_year) : "");
  }, [visible, transaction]);

  const handleSave = async () => {
    const isoDate = fieldsToIsoDate(day, month, occurredYear);
    const numericAmount = Number(amount);
    if (!isoDate || !numericAmount || numericAmount <= 0) return;
    if (type === "transfer" && !transferAccountId) return;

    const isExpense = type === "expense";
    const parsedAssessmentYear = Number(assessmentYear);

    const data = {
      account_id: account.id,
      transfer_account_id: type === "transfer" ? transferAccountId : null,
      type,
      amount: numericAmount,
      occurred_at: isoDate,
      description: description.trim() || null,
      note: note.trim() || null,
      tax_relief_category: isExpense ? taxReliefCategory : null,
      assessment_year:
        isExpense && taxReliefCategory && parsedAssessmentYear > 0 ? parsedAssessmentYear : null,
    };

    try {
      if (isEditing) {
        await updateTransaction({ id: transaction.id, data });
      } else {
        await createTransaction(data);
      }
      onClose();
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Unknown error" });
    }
  };

  const isSaving = isCreating || isUpdating;
  const isoPreview = fieldsToIsoDate(day, month, occurredYear);
  const isComplete =
    !!amount && Number(amount) > 0 && !!isoPreview && (type !== "transfer" || !!transferAccountId);
  const outflow = isOutflowType(type);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4 max-h-[90%]"
            style={{ marginBottom: TAB_BAR_BASE_HEIGHT + insets.bottom }}
          >
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="text-[20px] font-bold text-white">
                  {isEditing ? "Edit Transaction" : "Add Transaction"}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">{account.name}</Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-700/50">
                <Ionicons name="close" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              className="px-6"
            >
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Type
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {TRANSACTION_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setType(t)}
                      className={`rounded-lg px-3 py-2 border-2 ${
                        type === t ? "border-sky-500 bg-sky-500/10" : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <Text
                        className={`font-bold text-[12px] ${
                          type === t ? "text-sky-400" : "text-slate-300"
                        }`}
                      >
                        {TRANSACTION_TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {type === "transfer" && (
                <View className="mb-4">
                  <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Transfer To
                  </Text>
                  {transferTargets.length === 0 ? (
                    <Text className="text-[12px] text-slate-500">
                      Add another account first to transfer between accounts.
                    </Text>
                  ) : (
                    <View className="flex-row flex-wrap gap-2">
                      {transferTargets.map((a) => (
                        <TouchableOpacity
                          key={a.id}
                          onPress={() => setTransferAccountId(a.id)}
                          className={`rounded-lg px-3 py-2 border-2 ${
                            transferAccountId === a.id
                              ? "border-sky-500 bg-sky-500/10"
                              : "border-slate-600 bg-slate-700/30"
                          }`}
                        >
                          <Text
                            className={`font-bold text-[12px] ${
                              transferAccountId === a.id ? "text-sky-400" : "text-slate-300"
                            }`}
                          >
                            {a.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Amount (RM)
                </Text>
                <View className="flex-row items-center border border-slate-600 rounded-lg bg-slate-700/30 px-3 py-3">
                  <Text className={`mr-2 font-bold ${outflow ? "text-red-400" : "text-emerald-400"}`}>
                    {outflow ? "-" : "+"}RM
                  </Text>
                  <TextInput
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    placeholderTextColor="#64748b"
                    className="flex-1 text-[13px] text-white"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Date
                </Text>
                <DateFields
                  day={day}
                  month={month}
                  year={occurredYear}
                  onChangeDay={setDay}
                  onChangeMonth={setMonth}
                  onChangeYear={setOccurredYear}
                />
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Description (optional)
                </Text>
                <TextInput
                  placeholder="e.g., Salary, Groceries"
                  value={description}
                  onChangeText={setDescription}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              <View className="mb-6">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Note (optional)
                </Text>
                <TextInput
                  placeholder="Any extra detail"
                  value={note}
                  onChangeText={setNote}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              {type === "expense" && (
                <TaxReliefPicker
                  categoryKey={taxReliefCategory}
                  assessmentYear={assessmentYear}
                  onChangeCategory={(key) => {
                    setTaxReliefCategory(key);
                    if (key && !assessmentYear) setAssessmentYear(String(new Date().getFullYear()));
                  }}
                  onChangeAssessmentYear={setAssessmentYear}
                />
              )}

              {isEditing && transaction && <ReceiptsSection transactionId={transaction.id} />}

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 rounded-lg bg-slate-700/50 py-3 border border-slate-600"
                >
                  <Text className="text-center font-semibold text-slate-200 text-[14px]">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!isComplete || isSaving}
                  onPress={handleSave}
                  className={`flex-1 rounded-lg py-3 ${
                    isComplete && !isSaving
                      ? "bg-linear-to-r from-sky-500 to-sky-600"
                      : "bg-slate-600/30 opacity-50"
                  }`}
                >
                  <Text className="text-center font-semibold text-white text-[14px]">
                    {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Transaction"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
