import { calendarDateToIso, DateField, isoToCalendarDate, today } from "@/components/date-field";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { ReceiptsSection } from "@/components/transactions/receipts-section";
import { TaxReliefPicker } from "@/components/transactions/tax-relief-picker";
import { TaxReliefCategoryKey } from "@/interface/tax-relief";
import { TransactionInterface, TransactionType } from "@/interface/transaction";
import { useCreateTransaction, useDeleteTransaction, useUpdateTransaction } from "@/services/transaction";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
  transaction?: TransactionInterface | null;
};

export function AddTransactionModal({ visible, onClose, transaction }: Props) {
  const isEditing = !!transaction;

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [occurredDate, setOccurredDate] = useState<Date | null>(null);
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [taxReliefCategory, setTaxReliefCategory] = useState<TaxReliefCategoryKey | null>(null);
  const [assessmentYear, setAssessmentYear] = useState("");
  // Set only in the "Add" flow, the moment a receipt is attached before the
  // transaction has otherwise been saved — see ensureDraftTransaction below.
  const [draftTransactionId, setDraftTransactionId] = useState<number | null>(null);

  const { mutateAsync: createTransaction, isPending: isCreating } = useCreateTransaction();
  const { mutateAsync: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { mutateAsync: deleteTransaction } = useDeleteTransaction();
  const { error, isVisible, hideError, showError } = useErrorModal();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;

    setOccurredDate(transaction ? isoToCalendarDate(transaction.occurred_at) : today());

    setType(transaction?.type ?? "expense");
    setAmount(transaction ? String(transaction.amount) : "");
    setDescription(transaction?.description ?? "");
    setNote(transaction?.note ?? "");
    setTaxReliefCategory((transaction?.tax_relief_category as TaxReliefCategoryKey | null) ?? null);
    setAssessmentYear(transaction?.assessment_year ? String(transaction.assessment_year) : "");
    setDraftTransactionId(null);
  }, [visible, transaction]);

  const buildData = () => {
    const isoDate = occurredDate ? calendarDateToIso(occurredDate) : null;
    const numericAmount = Number(amount);
    const isExpense = type === "expense";
    const parsedAssessmentYear = Number(assessmentYear);

    return {
      isoDate,
      numericAmount,
      data: {
        type,
        amount: numericAmount,
        occurred_at: isoDate ?? undefined,
        description: description.trim() || null,
        note: note.trim() || null,
        tax_relief_category: isExpense ? taxReliefCategory : null,
        assessment_year:
          isExpense && taxReliefCategory && parsedAssessmentYear > 0 ? parsedAssessmentYear : null,
      },
    };
  };

  // Lazily creates the transaction the first time a receipt is attached
  // during the "Add" flow, so Receipts has a real transaction_id to attach
  // to before the user taps "Add Transaction". Subsequent attaches reuse
  // the same draft id; the final save updates it instead of re-creating it.
  const ensureDraftTransaction = async (): Promise<number> => {
    if (draftTransactionId != null) return draftTransactionId;

    const { isoDate, numericAmount, data } = buildData();
    if (!isoDate || !numericAmount || numericAmount <= 0) {
      throw new Error("Enter an amount and date first, then attach a receipt.");
    }

    const created = await createTransaction(data);
    setDraftTransactionId(created.id);
    return created.id;
  };

  const handleSave = async () => {
    const { isoDate, numericAmount, data } = buildData();
    if (!isoDate || !numericAmount || numericAmount <= 0) return;

    try {
      if (isEditing) {
        await updateTransaction({ id: transaction.id, data });
      } else if (draftTransactionId != null) {
        // A receipt was already attached, which created this row — finalize it.
        await updateTransaction({ id: draftTransactionId, data });
      } else {
        await createTransaction(data);
      }
      onClose();
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Unknown error" });
    }
  };

  const handleClose = async () => {
    if (!isEditing && draftTransactionId != null) {
      // Backing out after attaching a receipt but before finalizing — don't
      // leave an orphaned transaction behind (deleteTransaction also cleans
      // up its receipts).
      await deleteTransaction(draftTransactionId).catch(() => {});
    }
    onClose();
  };

  const isSaving = isCreating || isUpdating;
  const isoPreview = occurredDate ? calendarDateToIso(occurredDate) : null;
  const isComplete = !!amount && Number(amount) > 0 && !!isoPreview;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/50" style={{ paddingTop: insets.top + 24 }}>
          <View
            className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4"
            style={{ marginTop: "60%" }}
          >
            <View className="flex-row items-center justify-between px-6 mb-4">
              <Text className="text-[20px] font-bold text-white">
                {isEditing ? "Edit Transaction" : "Add Transaction"}
              </Text>
              <TouchableOpacity onPress={handleClose} className="p-2 rounded-full bg-slate-700/50">
                <Ionicons name="close" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              className="px-6"
            >
              {isEditing ? (
                <ReceiptsSection transactionId={transaction.id} hideUploadButtons />
              ) : (
                <ReceiptsSection transactionId={draftTransactionId} onRequireTransactionId={ensureDraftTransaction} />
              )}

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

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Amount (RM)
                </Text>
                <View className="flex-row items-center border border-slate-600 rounded-lg bg-slate-700/30 px-3 py-3">
                  <Text className="mr-2 font-bold text-slate-300">RM</Text>
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
                <DateField value={occurredDate} onChange={setOccurredDate} accentColor="#0ea5e9" />
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

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleClose}
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
