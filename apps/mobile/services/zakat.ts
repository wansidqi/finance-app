import { UpdateZakatTrackerRequest } from "@/interface/zakat";
import {
  getAllCategories,
  getZakatSettings,
  setCombineCategories,
  upsertTracker,
} from "@/local/zakat-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetZakatCategories = () => {
  return useQuery({
    queryKey: ["zakat-categories"],
    queryFn: async () => {
      return getAllCategories();
    },
  });
};

export const useUpdateZakatTracker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateZakatTrackerRequest) => {
      return upsertTracker(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-categories"] });
    },
  });
};

export const useGetZakatSettings = () => {
  return useQuery({
    queryKey: ["zakat-settings"],
    queryFn: async () => {
      return getZakatSettings();
    },
  });
};

export const useSetZakatCombineMode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (combine: boolean) => {
      return setCombineCategories(combine);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-settings"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-categories"] });
    },
  });
};
