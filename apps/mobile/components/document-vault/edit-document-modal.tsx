import { calendarDateToIso, DateField, isoToCalendarDate } from "@/components/date-field";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { VaultDocumentInterface } from "@/interface/document-vault";
import { useGetVaultDocuments, useUpdateVaultDocument } from "@/services/vault";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView, useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Matches the floating tab bar height in app/(tabs)/_layout.tsx, so the
// sheet's bottom row of buttons doesn't sit underneath it.
const TAB_BAR_BASE_HEIGHT = 52;

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
  const insets = useSafeAreaInsets();
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);

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
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setReplacementAsset({
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
    });
  };

  return (
    <Modal visible={!!doc} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4 max-h-[90%]"
            style={{ marginBottom: isKeyboardVisible ? 0 : TAB_BAR_BASE_HEIGHT + insets.bottom }}
          >
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="text-[20px] font-bold text-white">Edit Document</Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">Update the name, folder, note, or expiry</Text>
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
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">Name</Text>
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
                  <Text className="text-[12px] font-bold text-slate-300 uppercase tracking-wider">Expiry Date</Text>
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
                {hasExpiry && <DateField value={expiryDate} onChange={setExpiryDate} accentColor="#2dd4bf" />}
              </View>

              <View className="mb-6">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">File</Text>
                {replacementAsset ? (
                  <View className="rounded-lg border border-slate-600 bg-slate-700/30 px-3 py-3 flex-row items-center gap-3">
                    <View className="h-9 w-9 rounded-full bg-teal-500/15 items-center justify-center">
                      <Ionicons
                        name={replacementAsset.mimeType.startsWith("image/") ? "image" : "document-text"}
                        size={16}
                        color="#2dd4bf"
                      />
                    </View>
                    <Text className="flex-1 text-[13px] text-white" numberOfLines={1}>
                      {replacementAsset.fileName}
                    </Text>
                    <TouchableOpacity onPress={() => setReplacementAsset(null)} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View className="rounded-lg border border-slate-600 bg-slate-700/30 px-3 py-3 flex-row items-center gap-3 mb-3">
                      <View className="h-9 w-9 rounded-full bg-teal-500/15 items-center justify-center">
                        <Ionicons
                          name={doc?.mime_type.startsWith("image/") ? "image" : "document-text"}
                          size={16}
                          color="#2dd4bf"
                        />
                      </View>
                      <Text className="flex-1 text-[13px] text-white" numberOfLines={1}>
                        {doc?.file_name}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">
                      Replace file (optional)
                    </Text>
                    <View className="flex-row gap-2">
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
              </View>

              <TouchableOpacity
                onPress={handleSave}
                disabled={!isComplete || isSaving}
                className={`rounded-lg py-3 ${
                  isComplete && !isSaving ? "bg-linear-to-r from-teal-500 to-teal-600" : "bg-slate-600/30 opacity-50"
                }`}
              >
                <Text className="text-center font-semibold text-white text-[14px]">
                  {isSaving ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
