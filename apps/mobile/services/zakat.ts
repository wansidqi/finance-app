import { UpdateZakatTrackerRequest } from "@/interface/zakat";
import { getAllCategories, upsertTracker } from "@/local/zakat-service";
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
