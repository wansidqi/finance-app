import { useEncryptionRecoveryKey, useImportRecoveryKey } from "@/services/backup-hooks";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Lets the user view their device's current backup encryption key (to save
 * somewhere safe) or paste in a previously-saved one — needed to restore an
 * encrypted backup on a new device or after reinstalling, since the key is
 * never sent anywhere on its own. See plan.md's "Backup Encryption" section.
 */
export function RecoveryKeyModal({ visible, onClose }: Props) {
  const { data: currentKey } = useEncryptionRecoveryKey();
  const { mutateAsync: importKey, isPending } = useImportRecoveryKey();
  const [importValue, setImportValue] = useState("");
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleCopy = async () => {
    if (!currentKey) return;
    await Clipboard.setStringAsync(currentKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = async () => {
    setImportError(null);
    setImportSuccess(false);
    try {
      await importKey(importValue);
      setImportValue("");
      setImportSuccess(true);
    } catch (err: any) {
      setImportError(err?.message ?? "Invalid recovery key");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-6 max-h-[85%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-[18px] font-bold">Encryption Recovery Key</Text>
            <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-700/50">
              <Ionicons name="close" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text className="text-slate-400 text-[12px] mb-4">
              This key encrypts your backups on this device. It&apos;s never uploaded anywhere.
              Save it somewhere safe — without it, an encrypted backup can&apos;t be restored on
              a new device or after reinstalling.
            </Text>

            <Text className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
              This Device&apos;s Key
            </Text>
            <View className="bg-black/40 border border-white/10 rounded-lg p-3 mb-2">
              <Text className="text-emerald-300 text-[11px] font-mono">
                {currentKey ?? "No encryption key yet — enable encryption first."}
              </Text>
            </View>
            {currentKey && (
              <TouchableOpacity
                onPress={handleCopy}
                className="self-start bg-white/5 border border-white/10 rounded-lg px-3 py-2 mb-6"
              >
                <Text className="text-slate-200 text-[12px] font-semibold">
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Text>
              </TouchableOpacity>
            )}

            <View className="h-px bg-white/10 mb-4" />

            <Text className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Restore a Key (new device / reinstall)
            </Text>
            <TextInput
              value={importValue}
              onChangeText={setImportValue}
              placeholder="64-character recovery key"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-lg border border-slate-600 px-3 py-3 text-[12px] text-white bg-slate-700/30 font-mono mb-2"
            />
            {importError && (
              <Text className="text-red-400 text-[11px] mb-2">{importError}</Text>
            )}
            {importSuccess && (
              <Text className="text-emerald-400 text-[11px] mb-2">Recovery key imported.</Text>
            )}
            <TouchableOpacity
              onPress={handleImport}
              disabled={!importValue.trim() || isPending}
              className={`rounded-lg py-3 ${
                importValue.trim() && !isPending ? "bg-emerald-500" : "bg-slate-600/30 opacity-50"
              }`}
            >
              <Text className="text-center text-white font-semibold text-[13px]">
                {isPending ? "Importing..." : "Import Key"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
