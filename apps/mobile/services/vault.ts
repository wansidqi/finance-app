import {
  addVaultDocument as localAddVaultDocument,
  deleteVaultDocument as localDeleteVaultDocument,
  getAllDocuments,
  getVaultDocumentData,
} from "@/local/vault-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File } from "expo-file-system";

const VAULT_KEY = ["vault-documents"];

export const useGetVaultDocuments = () => {
  return useQuery({
    queryKey: VAULT_KEY,
    queryFn: getAllDocuments,
  });
};

type AddVaultDocumentInput = {
  name: string;
  uri: string;
  file_name: string;
  mime_type: string;
  expiry_date?: string | null;
  note?: string | null;
  folder?: string | null;
};

export const useAddVaultDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uri, ...rest }: AddVaultDocumentInput) => {
      const bytes = await new File(uri).bytes();
      return localAddVaultDocument({ ...rest, bytes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VAULT_KEY });
    },
  });
};

export const useDeleteVaultDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => localDeleteVaultDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VAULT_KEY });
    },
  });
};

export { getVaultDocumentData };
