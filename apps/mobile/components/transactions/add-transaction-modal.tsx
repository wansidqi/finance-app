import { calendarDateToIso, DateField, isoToCalendarDate, today } from "@/components/date-field";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { ReceiptsSection } from "@/components/transactions/receipts-section";
import { TaxReliefPicker } from "@/components/transactions/tax-relief-picker";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { TextField } from "@/components/ui/text-field";
import { TaxReliefCategoryKey } from "@/interface/tax-relief";
import { TransactionInterface, TransactionType } from "@/interface/transaction";
import { useCreateTransaction, useDeleteTransaction, useUpdateTransaction } from "@/services/transaction";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from "./category";

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
    <>
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <BottomSheetModal
        visible={visible}
        onClose={handleClose}
        title={isEditing ? "Edit Transaction" : "Add Transaction"}
        footer={
          <View className="flex-row gap-3">
            <Button label="Cancel" variant="outline" className="flex-1" onPress={handleClose} />
            <Button
              label={isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Transaction"}
              variant="primary"
              className="flex-1"
              disabled={!isComplete || isSaving}
              onPress={handleSave}
            />
          </View>
        }
      >
        {isEditing ? (
          <ReceiptsSection transactionId={transaction.id} hideUploadButtons />
        ) : (
          <ReceiptsSection transactionId={draftTransactionId} onRequireTransactionId={ensureDraftTransaction} />
        )}

        <View className="mb-4">
          <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
            Type
          </Text>
          <ChipGroup
            options={TRANSACTION_TYPES.map((t) => ({ value: t, label: TRANSACTION_TYPE_LABELS[t] }))}
            value={type}
            onChange={setType}
          />
        </View>

        <View className="mb-4">
          <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
            Amount (RM)
          </Text>
          <TextField
            prefix="RM"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View className="mb-4">
          <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
            Date
          </Text>
          <DateField value={occurredDate} onChange={setOccurredDate} />
        </View>

        <View className="mb-4">
          <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
            Description (optional)
          </Text>
          <TextField
            placeholder="e.g., Salary, Groceries"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View className="mb-6">
          <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
            Note (optional)
          </Text>
          <TextField
            placeholder="Any extra detail"
            value={note}
            onChangeText={setNote}
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
      </BottomSheetModal>
    </>
  );
}
