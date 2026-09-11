import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { IconButton } from "@/components/ui/icon-button";
import { ReceiptAttachmentInterface } from "@/interface/receipt";
import { getReceiptData, useAddReceipt, useDeleteReceipt, useGetReceiptsByTransaction } from "@/services/receipt";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

// Scratch space for a receipt's bytes while it's open for viewing/sharing —
// overwritten on every open, never relied on to persist.
const VIEW_DIR = new Directory(Paths.cache, "receipt-view");

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  // Null while a new transaction hasn't been saved yet — attaching in that
  // state calls onRequireTransactionId to create it on the fly.
  transactionId: number | null;
  onRequireTransactionId?: () => Promise<number>;
  // Editing an already-saved transaction shows existing receipts (view/delete)
  // but not the Camera/Photo/File buttons — new attachments only happen
  // while creating a transaction, per product decision.
  hideUploadButtons?: boolean;
};

export function ReceiptsSection({ transactionId, onRequireTransactionId, hideUploadButtons = false }: Props) {
  const { data: receipts = [], isLoading } = useGetReceiptsByTransaction(transactionId);
  const { mutateAsync: addReceipt, isPending: isAdding } = useAddReceipt();
  const { mutateAsync: deleteReceipt, isPending: isDeleting } = useDeleteReceipt(transactionId ?? 0);

  const [viewing, setViewing] = useState<{ uri: string; mimeType: string } | null>(null);
  const [isOpeningId, setIsOpeningId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const resolveTransactionId = async (): Promise<number | null> => {
    if (transactionId != null) return transactionId;
    if (!onRequireTransactionId) return null;
    try {
      return await onRequireTransactionId();
    } catch (err: any) {
      Alert.alert("Can't attach yet", err?.message ?? "Fill in the required fields first.");
      return null;
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Enable camera access to photograph a receipt.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const id = await resolveTransactionId();
    if (id == null) return;
    const asset = result.assets[0];
    await addReceipt({
      transaction_id: id,
      uri: asset.uri,
      file_name: asset.fileName ?? `receipt-${Date.now()}.jpg`,
      mime_type: asset.mimeType ?? "image/jpeg",
    });
  };

  const handleChoosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Enable photo library access to attach a receipt.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true });
    if (result.canceled) return;
    const id = await resolveTransactionId();
    if (id == null) return;
    for (const asset of result.assets) {
      await addReceipt({
        transaction_id: id,
        uri: asset.uri,
        file_name: asset.fileName ?? `receipt-${Date.now()}.jpg`,
        mime_type: asset.mimeType ?? "image/jpeg",
      });
    }
  };

  const handleChooseDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      multiple: true,
    });
    if (result.canceled) return;
    const id = await resolveTransactionId();
    if (id == null) return;
    for (const asset of result.assets) {
      await addReceipt({
        transaction_id: id,
        uri: asset.uri,
        file_name: asset.name,
        mime_type: asset.mimeType ?? "application/octet-stream",
      });
    }
  };

  const handleOpen = async (receipt: ReceiptAttachmentInterface) => {
    setIsOpeningId(receipt.id);
    try {
      const full = await getReceiptData(receipt.id);
      if (!full) return;

      if (!VIEW_DIR.exists) VIEW_DIR.create({ intermediates: true, idempotent: true });
      const file = new File(VIEW_DIR, full.file_name);
      if (file.exists) file.delete();
      file.write(full.data);

      if (full.mime_type.startsWith("image/")) {
        setViewing({ uri: file.uri, mimeType: full.mime_type });
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: full.mime_type });
      } else {
        Alert.alert("Can't open file", "No app is available on this device to open this file type.");
      }
    } finally {
      setIsOpeningId(null);
    }
  };

  const handleDelete = async () => {
    if (deletingId == null) return;
    await deleteReceipt(deletingId);
    setDeletingId(null);
  };

  const isBusy = isAdding;

  return (
    <View className="mb-6">
      <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
        Receipts
      </Text>

      {!hideUploadButtons && (
        <View className="flex-row gap-2 mb-3">
          <TouchableOpacity
            onPress={handleTakePhoto}
            disabled={isBusy}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-input border border-glass-edge bg-white/5 py-2.5"
          >
            <Ionicons name="camera-outline" size={16} color="#d1e4fa" />
            <Text className="font-sans text-[11px] font-semibold text-mist">Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleChoosePhoto}
            disabled={isBusy}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-input border border-glass-edge bg-white/5 py-2.5"
          >
            <Ionicons name="image-outline" size={16} color="#d1e4fa" />
            <Text className="font-sans text-[11px] font-semibold text-mist">Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleChooseDocument}
            disabled={isBusy}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-input border border-glass-edge bg-white/5 py-2.5"
          >
            <Ionicons name="document-attach-outline" size={16} color="#d1e4fa" />
            <Text className="font-sans text-[11px] font-semibold text-mist">File</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAdding && (
        <View className="flex-row items-center gap-2 mb-2">
          <ActivityIndicator size="small" color="#d1e4fa" />
          <Text className="font-sans text-[11px] text-mist">Attaching...</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="small" color="#d1e4fa" />
      ) : receipts.length === 0 ? (
        <Text className="font-sans text-[11px] text-fog">No receipts attached yet.</Text>
      ) : (
        <View className="gap-2">
          {receipts.map((receipt) => (
            <View
              key={receipt.id}
              className="flex-row items-center justify-between rounded-input border border-glass-edge bg-white/[0.03] px-3 py-2.5"
            >
              <TouchableOpacity
                onPress={() => handleOpen(receipt)}
                disabled={isOpeningId === receipt.id}
                className="flex-1 flex-row items-center gap-2.5 pr-2"
              >
                {isOpeningId === receipt.id ? (
                  <ActivityIndicator size="small" color="#d1e4fa" />
                ) : (
                  <Ionicons
                    name={receipt.mime_type.startsWith("image/") ? "image-outline" : "document-text-outline"}
                    size={18}
                    color="#d1e4fa"
                  />
                )}
                <View className="flex-1">
                  <Text className="font-sans text-[12px] font-medium text-mist" numberOfLines={1}>
                    {receipt.file_name}
                  </Text>
                  <Text className="font-sans text-[10px] text-fog">{formatSize(receipt.size_bytes)}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDeletingId(receipt.id)}
                accessibilityRole="button"
                accessibilityLabel="Delete receipt"
                className="p-1.5"
              >
                <Ionicons name="trash-outline" size={16} color="#d1e4fa" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View className="flex-1 bg-black/95">
          <IconButton
            onPress={() => setViewing(null)}
            icon="close"
            label="Close"
            size={22}
            className="absolute top-14 right-6 z-10"
          />
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
          >
            {viewing && (
              <Image
                source={{ uri: viewing.uri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      <ConfirmDeleteModal
        visible={deletingId != null}
        title="Delete this receipt?"
        description="This can't be undone."
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </View>
  );
}
