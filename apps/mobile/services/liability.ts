import { LiabilityInterface } from "@/interface/liability";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "expo-router";

export const useGetLiabilities = () => {
  return useQuery({
    queryKey: ["liabilities"],
    queryFn: async () => {
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_API_URL}/api/liabilities`,
      );
      return response.data as LiabilityInterface[];
    },
  });
};

export const useGetLiabilitiesById = (id: any) => {
  return useQuery({
    queryKey: [`liabilities/${id}`],
    queryFn: async () => {
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_API_URL}/api/liabilities/${id}`,
      );
      return response.data as LiabilityInterface;
    },
  });
};

export const useCreateLiability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<LiabilityInterface>) => {
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/api/liabilities`,
        data,
      );
      return response.data as LiabilityInterface;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
    },
  });
};

export const useDeleteLiability = (id: any) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      const response = await axios.delete(
        `${process.env.EXPO_PUBLIC_API_URL}/api/liabilities/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
      router.push("/(tabs)/liability");
    },
  });
};

export const useUpdateLiabilityById = (id: any) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number | string;
      data: Partial<LiabilityInterface>;
    }) => {
      const response = await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/api/liabilities/${id}`,
        data,
      );
      return response.data as LiabilityInterface;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
      queryClient.invalidateQueries({ queryKey: [`liabilities/${id}`] });
    },
  });
};
