import { calendarDateToIso, DateField, isoToCalendarDate } from "@/components/date-field";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { useAddVaultDocument, useGetVaultDocuments } from "@/services/vault";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView, useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DocumentPreviewModal } from "./preview-modal";

// Matches the floating tab bar height in app/(tabs)/_layout.tsx, so the
// sheet's bottom row of buttons doesn't sit underneath it.
const TAB_BAR_BASE_HEIGHT = 52;

const PREVIEWABLE_MIME_TYPES = new Set(["application/pdf"]);
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
  const insets = useSafeAreaInsets();
  // Tab-bar clearance is only needed when the keyboard is closed — otherwise
  // it stacks on top of KeyboardAvoidingView's own padding, leaving a gap
  // between the sheet and the keyboard.
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);

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
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"] });
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
    <Modal visible={visible} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <DocumentPreviewModal
        visible={isPreviewVisible}
        uri={pickedAsset?.uri ?? null}
        mimeType={pickedAsset?.mimeType ?? null}
        onClose={() => setIsPreviewVisible(false)}
      />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4 max-h-[90%]"
            style={{ marginBottom: isKeyboardVisible ? 0 : TAB_BAR_BASE_HEIGHT + insets.bottom }}
          >
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="text-[20px] font-bold text-white">Add Document</Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Store an identity, insurance, or warranty document
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-700/50">
                <Ionicons name="close" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              className="px-6"
              keyboardShouldPersistTaps="handled"
            >
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Name
                </Text>
                <TextInput
                  placeholder='e.g., "MyKad", "Takaful Policy #4821"'
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Folder (optional)
                </Text>
                <TextInput
                  placeholder='e.g., "IC", "Project A"'
                  value={folder}
                  onChangeText={setFolder}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
                {existingFolders.length > 0 && (
                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {existingFolders.map((f) => (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setFolder(f)}
                        className={`rounded-full px-3 py-1 border ${
                          folder === f ? "border-teal-500/50 bg-teal-500/15" : "border-white/10 bg-white/5"
                        }`}
                      >
                        <Text className={`text-[11px] font-semibold ${folder === f ? "text-teal-400" : "text-slate-400"}`}>
                          {f}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Note (optional)
                </Text>
                <TextInput
                  placeholder="Any extra detail"
                  value={note}
                  onChangeText={setNote}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[12px] font-bold text-slate-300 uppercase tracking-wider">
                    Expiry Date
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setHasExpiry(!hasExpiry);
                      if (!hasExpiry && !expiryDate) setExpiryDate(isoToCalendarDate(new Date().toISOString()));
                    }}
                    className={`rounded-full px-3 py-1 ${hasExpiry ? "bg-teal-500/15 border border-teal-500/40" : "bg-white/5 border border-white/10"}`}
                  >
                    <Text className={`text-[11px] font-bold ${hasExpiry ? "text-teal-400" : "text-slate-400"}`}>
                      {hasExpiry ? "On" : "None"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {hasExpiry && (
                  <DateField value={expiryDate} onChange={setExpiryDate} accentColor="#2dd4bf" />
                )}
              </View>

              {pickedAsset ? (
                <View className="mb-6">
                  <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Selected File
                  </Text>
                  <View className="rounded-lg border border-slate-600 bg-slate-700/30 px-3 py-3 flex-row items-center gap-3 mb-3">
                    <View className="h-9 w-9 rounded-full bg-teal-500/15 items-center justify-center">
                      <Ionicons
                        name={pickedAsset.mimeType.startsWith("image/") ? "image" : "document-text"}
                        size={16}
                        color="#2dd4bf"
                      />
                    </View>
                    <Text className="flex-1 text-[13px] text-white" numberOfLines={1}>
                      {pickedAsset.fileName}
                    </Text>
                    <TouchableOpacity onPress={() => setPickedAsset(null)} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row gap-2">
                    {isPreviewable(pickedAsset.mimeType) && (
                      <TouchableOpacity
                        onPress={() => setIsPreviewVisible(true)}
                        className="flex-1 bg-teal-500/15 border border-teal-500/40 rounded-lg py-2.5 flex-row items-center justify-center gap-1.5"
                      >
                        <Ionicons name="eye-outline" size={15} color="#2dd4bf" />
                        <Text className="text-center font-semibold text-teal-400 text-[12px]">Preview</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={handleDownloadPicked}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2.5 flex-row items-center justify-center gap-1.5"
                    >
                      <Ionicons name="download-outline" size={15} color="#cbd5e1" />
                      <Text className="text-center font-semibold text-slate-200 text-[12px]">Download</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Capture
                  </Text>
                  <View className="flex-row gap-2 mb-6">
                    <TouchableOpacity
                      onPress={handleTakePhoto}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/30 py-2.5"
                    >
                      <Ionicons name="camera-outline" size={16} color="#cbd5e1" />
                      <Text className="text-[11px] font-semibold text-slate-200">Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleChoosePhoto}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/30 py-2.5"
                    >
                      <Ionicons name="image-outline" size={16} color="#cbd5e1" />
                      <Text className="text-[11px] font-semibold text-slate-200">Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleChooseDocument}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/30 py-2.5"
                    >
                      <Ionicons name="document-attach-outline" size={16} color="#cbd5e1" />
                      <Text className="text-[11px] font-semibold text-slate-200">File</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <TouchableOpacity
                onPress={handleSave}
                disabled={!isComplete || isSaving}
                className={`rounded-lg py-3 ${
                  isComplete && !isSaving ? "bg-linear-to-r from-teal-500 to-teal-600" : "bg-slate-600/30 opacity-50"
                }`}
              >
                <Text className="text-center font-semibold text-white text-[14px]">
                  {isSaving ? "Saving..." : "Save Document"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
