import { AssetInterface, BaseAsset } from "@/interface/asset";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "expo-router";

export const useGetAssets = () => {
  return useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_API_URL}/api/assets`,
        );
        return response.data as AssetInterface[];
      } catch (error) {
        console.log(error);
      }
    },
  });
};

export const useGetAssetsById = (id: string | number) => {
  return useQuery({
    queryKey: [`assets/${id}`],
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_API_URL}/api/assets/${id}`,
        );
        return response.data as AssetInterface;
      } catch (error) {
        console.log(error);
      }
    },
  });
};

export const useCreateAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AssetInterface>) => {
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/api/assets`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
};

export const useUpdateAssetById = (id: any) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BaseAsset) => {
      const response = await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/api/assets/${data.id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: [`assets/${id}`] });
    },
  });
};

export const useUpdateAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<BaseAsset> & { id: number }) => {
      const response = await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/api/assets/${data.id}`,
        data,
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: [`assets/${variables.id}`] });
    },
  });
};

export const useDeleteAsset = (id: any) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.delete(
        `${process.env.EXPO_PUBLIC_API_URL}/api/assets/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      router.push("/(tabs)/asset");
    },
  });
};

