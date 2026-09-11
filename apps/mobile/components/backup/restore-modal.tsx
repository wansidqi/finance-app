import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { DriveBackupFile } from "@/interface/backup";
import { useAvailableBackups, useRestoreBackup } from "@/services/backup-hooks";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RestoreModal({ visible, onClose }: Props) {
  const { data = [], isLoading, refetch, isRefetching } = useAvailableBackups(visible);
  const { mutateAsync: restore, isPending } = useRestoreBackup();
  const router = useRouter();

  const [selected, setSelected] = useState<DriveBackupFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const handleRestore = async () => {
    if (!selected) return;
    setError(null);
    try {
      await restore(selected.driveFileId);
      setRestored(true);
    } catch (err: any) {
      setError(err?.message ?? "Restore failed");
    }
  };

  const handleDone = () => {
    setSelected(null);
    setRestored(false);
    onClose();
    router.replace("/(tabs)");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="rounded-t-card bg-modal-surface border-t border-glass-edge shadow-modal pt-4 pb-8 max-h-[85%]">
          <View className="flex-row items-center justify-between px-6 mb-3">
            <Text className="font-display text-[18px] text-white">Restore Backup</Text>
            <IconButton onPress={onClose} icon="close" label="Close" size={18} />
          </View>

          {restored ? (
            <View className="px-6 py-8 items-center">
              <Ionicons name="checkmark-circle-outline" size={48} color="#d1e4fa" />
              <Text className="font-sans text-white text-[15px] font-semibold mt-4 text-center">
                Restore complete
              </Text>
              <Text className="font-sans text-fog text-[12px] mt-1 text-center">
                Your data has been replaced with the selected backup.
              </Text>
              <Button label="Done" variant="primary" onPress={handleDone} className="mt-6 px-6" />
            </View>
          ) : selected ? (
            <View className="px-6">
              <View className="bg-white/5 border border-glass-edge rounded-card p-4 mb-4">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Ionicons name="warning-outline" size={14} color="#d1e4fa" />
                  <Text className="font-sans text-frost text-[13px] font-semibold">
                    Restore this backup?
                  </Text>
                </View>
                <Text className="font-sans text-mist text-[12px] mb-2">
                  {formatDate(selected.createdAt)} · {formatSize(selected.sizeBytes)}
                </Text>
                <Text className="font-sans text-fog text-[11px]">
                  This replaces your current financial data with the selected backup. A safety
                  copy of your current data is created on-device first.
                </Text>
              </View>

              {error && (
                <View className="flex-row items-center gap-1.5 mb-3">
                  <Ionicons name="alert-circle-outline" size={13} color="#d1e4fa" />
                  <Text className="font-sans text-frost text-[12px]">{error}</Text>
                </View>
              )}

              <View className="flex-row gap-3">
                <Button
                  label="Cancel"
                  variant="outline"
                  disabled={isPending}
                  onPress={() => setSelected(null)}
                  className="flex-1"
                />
                <Button
                  label={isPending ? "Restoring..." : "Restore"}
                  variant="primary"
                  disabled={isPending}
                  loading={isPending}
                  onPress={handleRestore}
                  className="flex-1"
                />
              </View>
            </View>
          ) : (
            <ScrollView
              className="px-6"
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {isLoading || isRefetching ? (
                <View className="py-10 items-center">
                  <ActivityIndicator color="#663af3" />
                </View>
              ) : data.length === 0 ? (
                <View className="py-10 items-center">
                  <Ionicons name="cloud-offline-outline" size={40} color="#9da7ba" />
                  <Text className="font-sans text-fog text-[13px] mt-3">No backups found</Text>
                  <TouchableOpacity onPress={() => refetch()} className="mt-3">
                    <Text className="font-sans text-frost text-[12px] font-semibold">Refresh</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-2">
                  {data.map((file) => (
                    <TouchableOpacity
                      key={file.driveFileId}
                      onPress={() => setSelected(file)}
                      className="flex-row items-center justify-between bg-glass-surface border border-glass-edge rounded-card px-4 py-3.5"
                    >
                      <View>
                        <Text className="font-sans text-white text-[13px] font-semibold">
                          {formatDate(file.createdAt)}
                        </Text>
                        <Text className="font-sans text-fog text-[11px] mt-0.5">
                          {formatSize(file.sizeBytes)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward-outline" size={18} color="#9da7ba" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
