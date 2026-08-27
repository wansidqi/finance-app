import { AssetInterface, BaseAsset } from "@/interface/asset";
import {
  createAsset as localCreateAsset,
  deleteAsset as localDeleteAsset,
  getAllAssets,
  getAssetById,
  updateAsset as localUpdateAsset,
} from "@/local/asset-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

export const useGetAssets = () => {
  return useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      try {
        return await getAllAssets();
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
        return await getAssetById(Number(id));
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
      return localCreateAsset(data);
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
      return localUpdateAsset(data);
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
      return localUpdateAsset(data);
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
      return localDeleteAsset(Number(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      router.push("/(tabs)/asset");
    },
  });
};
