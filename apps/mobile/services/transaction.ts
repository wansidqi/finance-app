import {
  createTransaction as localCreateTransaction,
  deleteTransaction as localDeleteTransaction,
  getTransactionsByAccount,
  updateTransaction as localUpdateTransaction,
} from "@/local/transaction-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const ACCOUNTS_KEY = ["accounts"];
const transactionsKey = (accountId: number) => ["transactions", accountId];

type CreateInput = Parameters<typeof localCreateTransaction>[0];
type UpdateInput = Parameters<typeof localUpdateTransaction>[1];

export const useGetTransactionsByAccount = (accountId: number) => {
  return useQuery({
    queryKey: transactionsKey(accountId),
    queryFn: () => getTransactionsByAccount(accountId),
    enabled: !!accountId,
  });
};

// Mutations can move money between two accounts (transfers) or affect an
// account other than the one the UI is currently viewing, so every mutation
// invalidates all transaction lists plus the accounts list (balances).
function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
  queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
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
