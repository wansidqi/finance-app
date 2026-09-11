import { calendarDateToIso, DateField, isoToCalendarDate } from "@/components/date-field";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { IconAvatar } from "@/components/ui/icon-avatar";
import { TextField } from "@/components/ui/text-field";
import { VaultDocumentInterface } from "@/interface/document-vault";
import { useGetVaultDocuments, useUpdateVaultDocument } from "@/services/vault";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

type PickedAsset = { uri: string; fileName: string; mimeType: string };

type Props = {
  doc: VaultDocumentInterface | null;
  onClose: () => void;
};

/**
 * Edits a document's metadata (name/folder/note/expiry) in place. The
 * underlying file can optionally be replaced via the same capture pickers
 * used when adding a document — left untouched otherwise.
 */
export function EditDocumentModal({ doc, onClose }: Props) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [folder, setFolder] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [replacementAsset, setReplacementAsset] = useState<PickedAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync: updateDocument } = useUpdateVaultDocument();
  const { data: existingDocuments = [] } = useGetVaultDocuments();
  const { error, isVisible, hideError, showError } = useErrorModal();

  const existingFolders = useMemo(() => {
    const names = existingDocuments.map((d) => d.folder).filter((f): f is string => !!f);
    return Array.from(new Set(names)).sort();
  }, [existingDocuments]);

  useEffect(() => {
    if (!doc) return;
    setName(doc.name);
    setNote(doc.note ?? "");
    setFolder(doc.folder ?? "");
    setHasExpiry(!!doc.expiry_date);
    setExpiryDate(doc.expiry_date ? isoToCalendarDate(doc.expiry_date) : null);
    setReplacementAsset(null);
  }, [doc]);

  const isComplete = name.trim().length > 0;

  const handleSave = async () => {
    if (!doc) return;
    setIsSaving(true);
    try {
      await updateDocument({
        id: doc.id,
        name: name.trim(),
        expiry_date: hasExpiry && expiryDate ? calendarDateToIso(expiryDate) : null,
        note: note.trim() || null,
        folder: folder.trim() || null,
        file: replacementAsset
          ? { uri: replacementAsset.uri, file_name: replacementAsset.fileName, mime_type: replacementAsset.mimeType }
          : null,
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
    setReplacementAsset({
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
    setReplacementAsset({
      uri: asset.uri,
      fileName: asset.fileName ?? `document-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  };

  const handleChooseDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setReplacementAsset({
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
    });
  };

  return (
    <BottomSheetModal
      visible={!!doc}
      onClose={onClose}
      title="Edit Document"
      subtitle="Update the name, folder, note, or expiry"
      footer={
        <Button
          label={isSaving ? "Saving..." : "Save Changes"}
          variant="primary"
          fullWidth
          disabled={!isComplete || isSaving}
          loading={isSaving}
          onPress={handleSave}
        />
      }
    >
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <View className="mb-4">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">Name</Text>
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
          <Text className="font-mono text-[12px] font-bold text-mist uppercase tracking-wider">Expiry Date</Text>
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

      <View className="mb-6">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">File</Text>
        {replacementAsset ? (
          <View className="rounded-input border border-glass-edge bg-white/5 px-3 py-3 flex-row items-center gap-3">
            <IconAvatar
              name={replacementAsset.mimeType.startsWith("image/") ? "image-outline" : "document-text-outline"}
              size={36}
            />
            <Text className="flex-1 font-sans text-[13px] text-white" numberOfLines={1}>
              {replacementAsset.fileName}
            </Text>
            <TouchableOpacity
              onPress={() => setReplacementAsset(null)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove replacement file"
            >
              <Ionicons name="close-circle-outline" size={20} color="#9da7ba" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View className="rounded-input border border-glass-edge bg-white/5 px-3 py-3 flex-row items-center gap-3 mb-3">
              <IconAvatar
                name={doc?.mime_type.startsWith("image/") ? "image-outline" : "document-text-outline"}
                size={36}
              />
              <Text className="flex-1 font-sans text-[13px] text-white" numberOfLines={1}>
                {doc?.file_name}
              </Text>
            </View>
            <Text className="font-mono text-[10px] text-fog mb-2 uppercase tracking-wider">
              Replace file (optional)
            </Text>
            <View className="flex-row gap-2">
              <Button label="Camera" icon="camera-outline" variant="outline" className="flex-1" onPress={handleTakePhoto} />
              <Button label="Photo" icon="image-outline" variant="outline" className="flex-1" onPress={handleChoosePhoto} />
              <Button label="File" icon="document-attach-outline" variant="outline" className="flex-1" onPress={handleChooseDocument} />
            </View>
          </>
        )}
      </View>
    </BottomSheetModal>
  );
}
