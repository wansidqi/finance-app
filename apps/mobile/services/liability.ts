import { LiabilityInterface } from "@/interface/liability";
import {
  createLiability as localCreateLiability,
  deleteLiability as localDeleteLiability,
  getAllLiabilities,
  getLiabilityById,
  updateLiability as localUpdateLiability,
} from "@/local/liability-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

export const useGetLiabilities = () => {
  return useQuery({
    queryKey: ["liabilities"],
    queryFn: async () => {
      return getAllLiabilities();
    },
  });
};

export const useGetLiabilitiesById = (id: any) => {
  return useQuery({
    queryKey: [`liabilities/${id}`],
    queryFn: async () => {
      return getLiabilityById(Number(id));
    },
  });
};

export const useCreateLiability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<LiabilityInterface>) => {
      return localCreateLiability(data);
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
      return localDeleteLiability(Number(id));
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
      return localUpdateLiability(Number(id), data);
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
      queryClient.invalidateQueries({ queryKey: [`liabilities/${id}`] });
    },
  });
};
