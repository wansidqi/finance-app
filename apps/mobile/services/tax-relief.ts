import { TaxReliefCategoryKey } from "@/interface/tax-relief";
import {
  getCapsForYear,
  getReliefSummary,
  getReliefTransactions,
  updateCap,
} from "@/local/tax-relief-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const summaryKey = (year: number) => ["tax-relief-summary", year];
const capsKey = (year: number) => ["tax-relief-caps", year];
const transactionsKey = (year: number) => ["tax-relief-transactions", year];

export const useGetReliefSummary = (year: number) => {
  return useQuery({
    queryKey: summaryKey(year),
    queryFn: () => getReliefSummary(year),
  });
};

export const useGetReliefTransactions = (year: number) => {
  return useQuery({
    queryKey: transactionsKey(year),
    queryFn: () => getReliefTransactions(year),
  });
};

export const useUpdateCap = (year: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryKey, capAmount }: { categoryKey: TaxReliefCategoryKey; capAmount: number }) =>
      updateCap(year, categoryKey, capAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: summaryKey(year) });
      queryClient.invalidateQueries({ queryKey: capsKey(year) });
    },
  });
};
