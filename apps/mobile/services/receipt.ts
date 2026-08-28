import {
  addReceipt as localAddReceipt,
  deleteReceipt as localDeleteReceipt,
  getReceiptData,
  getReceiptsByTransaction,
} from "@/local/receipt-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File } from "expo-file-system";

const receiptsKey = (transactionId: number) => ["receipts", transactionId];

export const useGetReceiptsByTransaction = (transactionId: number | null) => {
  return useQuery({
    queryKey: receiptsKey(transactionId ?? 0),
    queryFn: () => getReceiptsByTransaction(transactionId!),
    enabled: transactionId != null,
  });
};

type AddReceiptInput = {
  transaction_id: number;
  uri: string;
  file_name: string;
  mime_type: string;
};

export const useAddReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transaction_id, uri, file_name, mime_type }: AddReceiptInput) => {
      const bytes = await new File(uri).bytes();
      return localAddReceipt({ transaction_id, file_name, mime_type, bytes });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receiptsKey(variables.transaction_id) });
    },
  });
};

export const useDeleteReceipt = (transactionId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => localDeleteReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptsKey(transactionId) });
    },
  });
};

export { getReceiptData };
