import { UpdateZakatTrackerRequest, ZakatTrackerDto } from "@/interface/zakat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export const useGetZakatCategories = () => {
  return useQuery({
    queryKey: ["zakat-categories"],
    queryFn: async () => {
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_API_URL}/api/get-categories`,
      );
      return response.data as ZakatTrackerDto[];
    },
  });
};

export const useUpdateZakatTracker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateZakatTrackerRequest) => {
      const response = await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/api/zakat-tracker`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-categories"] });
    },
  });
};
