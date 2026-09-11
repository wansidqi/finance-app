import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/text-field";
import { useEncryptionRecoveryKey, useImportRecoveryKey } from "@/services/backup-hooks";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";

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
        <View className="w-full rounded-card bg-modal-surface border border-glass-edge shadow-modal p-6 max-h-[85%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-display text-[18px] text-white">Encryption Recovery Key</Text>
            <IconButton onPress={onClose} icon="close" label="Close" size={18} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text className="font-sans text-fog text-[12px] mb-4">
              This key encrypts your backups on this device. It&apos;s never uploaded anywhere.
              Save it somewhere safe — without it, an encrypted backup can&apos;t be restored on
              a new device or after reinstalling.
            </Text>

            <Text className="font-mono text-[10px] text-fog mb-2 uppercase tracking-wider">
              This Device&apos;s Key
            </Text>
            <View className="bg-black/40 border border-glass-edge rounded-input p-3 mb-2">
              <Text className="font-mono text-[11px] text-frost">
                {currentKey ?? "No encryption key yet — enable encryption first."}
              </Text>
            </View>
            {currentKey && (
              <Button
                label={copied ? "Copied!" : "Copy to Clipboard"}
                variant="outline"
                onPress={handleCopy}
                className="self-start mb-6"
              />
            )}

            <View className="h-px bg-glass-edge mb-4" />

            <Text className="font-mono text-[10px] text-fog mb-2 uppercase tracking-wider">
              Restore a Key (new device / reinstall)
            </Text>
            <TextField
              value={importValue}
              onChangeText={setImportValue}
              placeholder="64-character recovery key"
              autoCapitalize="none"
              autoCorrect={false}
              className="mb-2"
              style={{ fontFamily: "JetBrainsMono_400Regular" }}
            />
            {importError && (
              <View className="flex-row items-center gap-1.5 mb-2">
                <Ionicons name="alert-circle-outline" size={13} color="#d1e4fa" />
                <Text className="font-sans text-frost text-[11px]">{importError}</Text>
              </View>
            )}
            {importSuccess && (
              <View className="flex-row items-center gap-1.5 mb-2">
                <Ionicons name="checkmark-circle-outline" size={13} color="#d1e4fa" />
                <Text className="font-sans text-frost text-[11px]">Recovery key imported.</Text>
              </View>
            )}
            <Button
              label={isPending ? "Importing..." : "Import Key"}
              variant="primary"
              disabled={!importValue.trim() || isPending}
              onPress={handleImport}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
