import { calendarDateToIso, DateField, isoToCalendarDate } from "@/components/date-field";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { IconAvatar } from "@/components/ui/icon-avatar";
import { TextField } from "@/components/ui/text-field";
import { useAddVaultDocument, useGetVaultDocuments } from "@/services/vault";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { DocumentPreviewModal } from "./preview-modal";

const PREVIEWABLE_MIME_TYPES = new Set(["application/pdf", "text/html", "application/xhtml+xml"]);
const isPreviewable = (mimeType: string) =>
  mimeType.startsWith("image/") || PREVIEWABLE_MIME_TYPES.has(mimeType);

type PickedAsset = { uri: string; fileName: string; mimeType: string };

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * One document record = one file, unlike receipts (which allow multiple
 * attachments per transaction) — a vault document is individually named
 * ("MyKad front" vs "MyKad back"), so capture pickers here are single-select.
 *
 * Picking a file only stages it (`pickedAsset`) — it isn't written to the
 * vault until Save is tapped, so the name/folder/note/expiry fields stay
 * editable and the picked file can be previewed or swapped first.
 */
export function AddDocumentModal({ visible, onClose }: Props) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [folder, setFolder] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [pickedAsset, setPickedAsset] = useState<PickedAsset | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync: addDocument } = useAddVaultDocument();
  const { data: existingDocuments = [] } = useGetVaultDocuments();
  const { error, isVisible, hideError, showError } = useErrorModal();

  const existingFolders = useMemo(() => {
    const names = existingDocuments.map((d) => d.folder).filter((f): f is string => !!f);
    return Array.from(new Set(names)).sort();
  }, [existingDocuments]);

  useEffect(() => {
    if (!visible) return;
    setName("");
    setNote("");
    setFolder("");
    setHasExpiry(false);
    setExpiryDate(null);
    setPickedAsset(null);
  }, [visible]);

  const isComplete = name.trim().length > 0 && pickedAsset != null;

  const handleSave = async () => {
    if (!pickedAsset) return;
    setIsSaving(true);
    try {
      await addDocument({
        name: name.trim(),
        uri: pickedAsset.uri,
        file_name: pickedAsset.fileName,
        mime_type: pickedAsset.mimeType,
        expiry_date: hasExpiry && expiryDate ? calendarDateToIso(expiryDate) : null,
        note: note.trim() || null,
        folder: folder.trim() || null,
      });
      onClose();
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Failed to save document" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Enable camera access to photograph a document.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPickedAsset({
      uri: asset.uri,
      fileName: asset.fileName ?? `document-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  };

  const handleChoosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Enable photo library access to attach a document.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPickedAsset({
      uri: asset.uri,
      fileName: asset.fileName ?? `document-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  };

  const handleChooseDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPickedAsset({
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
    });
  };

  const handleDownloadPicked = async () => {
    if (!pickedAsset) return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pickedAsset.uri, { mimeType: pickedAsset.mimeType });
    } else {
      Alert.alert("Can't save file", "No app is available on this device to save this file.");
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Add Document"
      subtitle="Store an identity, insurance, or warranty document"
      footer={
        <Button
          label={isSaving ? "Saving..." : "Save Document"}
          variant="primary"
          fullWidth
          disabled={!isComplete || isSaving}
          loading={isSaving}
          onPress={handleSave}
        />
      }
    >
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <DocumentPreviewModal
        visible={isPreviewVisible}
        uri={pickedAsset?.uri ?? null}
        mimeType={pickedAsset?.mimeType ?? null}
        onClose={() => setIsPreviewVisible(false)}
      />

      <View className="mb-4">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
          Name
        </Text>
        <TextField
          placeholder='e.g., "MyKad", "Takaful Policy #4821"'
          value={name}
          onChangeText={setName}
        />
      </View>

      <View className="mb-4">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
          Folder (optional)
        </Text>
        <TextField
          placeholder='e.g., "IC", "Project A"'
          value={folder}
          onChangeText={setFolder}
        />
        {existingFolders.length > 0 && (
          <ChipGroup
            className="mt-2"
            options={existingFolders.map((f) => ({ value: f, label: f }))}
            value={folder}
            onChange={setFolder}
          />
        )}
      </View>

      <View className="mb-4">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
          Note (optional)
        </Text>
        <TextField placeholder="Any extra detail" value={note} onChangeText={setNote} />
      </View>

      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-mono text-[12px] font-bold text-mist uppercase tracking-wider">
            Expiry Date
          </Text>
          <TouchableOpacity
            onPress={() => {
              setHasExpiry(!hasExpiry);
              if (!hasExpiry && !expiryDate) setExpiryDate(isoToCalendarDate(new Date().toISOString()));
            }}
            className={`rounded-button px-3 py-1 border ${hasExpiry ? "bg-luminous-fill border-glass-edge" : "bg-white/5 border-white/[0.06]"}`}
          >
            <Text className={`font-sans text-[11px] font-bold ${hasExpiry ? "text-white" : "text-fog"}`}>
              {hasExpiry ? "On" : "None"}
            </Text>
          </TouchableOpacity>
        </View>
        {hasExpiry && <DateField value={expiryDate} onChange={setExpiryDate} />}
      </View>

      {pickedAsset ? (
        <View className="mb-6">
          <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
            Selected File
          </Text>
          <View className="rounded-input border border-glass-edge bg-white/5 px-3 py-3 flex-row items-center gap-3 mb-3">
            <IconAvatar
              name={pickedAsset.mimeType.startsWith("image/") ? "image-outline" : "document-text-outline"}
              size={36}
            />
            <Text className="flex-1 font-sans text-[13px] text-white" numberOfLines={1}>
              {pickedAsset.fileName}
            </Text>
            <TouchableOpacity
              onPress={() => setPickedAsset(null)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove selected file"
            >
              <Ionicons name="close-circle-outline" size={20} color="#9da7ba" />
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-2">
            {isPreviewable(pickedAsset.mimeType) && (
              <Button
                label="Preview"
                icon="eye-outline"
                variant="outline"
                className="flex-1"
                onPress={() => setIsPreviewVisible(true)}
              />
            )}
            <Button
              label="Download"
              icon="download-outline"
              variant="outline"
              className="flex-1"
              onPress={handleDownloadPicked}
            />
          </View>
        </View>
      ) : (
        <>
          <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
            Capture
          </Text>
          <View className="flex-row gap-2 mb-6">
            <Button label="Camera" icon="camera-outline" variant="outline" className="flex-1" onPress={handleTakePhoto} />
            <Button label="Photo" icon="image-outline" variant="outline" className="flex-1" onPress={handleChoosePhoto} />
            <Button label="File" icon="document-attach-outline" variant="outline" className="flex-1" onPress={handleChooseDocument} />
          </View>
        </>
      )}
    </BottomSheetModal>
  );
}
