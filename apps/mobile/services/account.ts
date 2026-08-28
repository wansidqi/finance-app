import { AccountInterface } from "@/interface/account";
import {
  createAccount as localCreateAccount,
  deleteAccount as localDeleteAccount,
  getAccountById,
  getAllAccounts,
  setAccountArchived as localSetAccountArchived,
  updateAccount as localUpdateAccount,
} from "@/local/account-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const ACCOUNTS_KEY = ["accounts"];

export const useGetAccounts = () => {
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: getAllAccounts,
  });
};

export const useGetAccountById = (id: number) => {
  return useQuery({
    queryKey: [`accounts/${id}`],
    queryFn: () => getAccountById(id),
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AccountInterface>) => localCreateAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<AccountInterface, "balance">> }) =>
      localUpdateAccount(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: [`accounts/${variables.id}`] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => localDeleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useSetAccountArchived = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      localSetAccountArchived(id, archived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
};
