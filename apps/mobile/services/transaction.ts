import {
  createTransaction as localCreateTransaction,
  deleteTransaction as localDeleteTransaction,
  getAllTransactions,
  updateTransaction as localUpdateTransaction,
} from "@/local/transaction-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const TRANSACTIONS_KEY = ["transactions"];

type CreateInput = Parameters<typeof localCreateTransaction>[0];
type UpdateInput = Parameters<typeof localUpdateTransaction>[1];

export const useGetTransactions = () => {
  return useQuery({
    queryKey: TRANSACTIONS_KEY,
    queryFn: getAllTransactions,
  });
};

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
  // A transaction's tax-relief tag/amount/year can change here too, so any
  // Tax Relief screen showing a summary for an affected year needs to refetch.
  queryClient.invalidateQueries({ queryKey: ["tax-relief-summary"] });
  queryClient.invalidateQueries({ queryKey: ["tax-relief-transactions"] });
}

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInput) => localCreateTransaction(data),
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInput }) => localUpdateTransaction(id, data),
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => localDeleteTransaction(id),
    onSuccess: () => invalidateAll(queryClient),
  });
};
