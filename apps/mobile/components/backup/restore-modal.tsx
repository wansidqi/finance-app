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
        <View className="rounded-t-3xl bg-slate-900 border-t border-slate-700 pt-4 pb-8 max-h-[85%]">
          <View className="flex-row items-center justify-between px-6 mb-3">
            <Text className="text-white text-[18px] font-bold">Restore Backup</Text>
            <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-700/50">
              <Ionicons name="close" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          {restored ? (
            <View className="px-6 py-8 items-center">
              <Ionicons name="checkmark-circle" size={48} color="#34d399" />
              <Text className="text-white text-[15px] font-semibold mt-4 text-center">
                Restore complete
              </Text>
              <Text className="text-slate-400 text-[12px] mt-1 text-center">
                Your data has been replaced with the selected backup.
              </Text>
              <TouchableOpacity
                onPress={handleDone}
                className="mt-6 bg-emerald-500 rounded-lg px-6 py-3"
              >
                <Text className="text-white font-semibold text-[13px]">Done</Text>
              </TouchableOpacity>
            </View>
          ) : selected ? (
            <View className="px-6">
              <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                <Text className="text-amber-300 text-[13px] font-semibold mb-1">
                  Restore this backup?
                </Text>
                <Text className="text-slate-300 text-[12px] mb-2">
                  {formatDate(selected.createdAt)} · {formatSize(selected.sizeBytes)}
                </Text>
                <Text className="text-slate-400 text-[11px]">
                  This replaces your current financial data with the selected backup. A safety
                  copy of your current data is created on-device first.
                </Text>
              </View>

              {error && <Text className="text-red-400 text-[12px] mb-3">{error}</Text>}

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  disabled={isPending}
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg py-3"
                >
                  <Text className="text-center text-slate-200 font-semibold text-[13px]">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRestore}
                  disabled={isPending}
                  className={`flex-1 rounded-lg py-3 ${isPending ? "bg-amber-500/50" : "bg-amber-500"}`}
                >
                  <Text className="text-center text-white font-semibold text-[13px]">
                    {isPending ? "Restoring..." : "Restore"}
                  </Text>
                </TouchableOpacity>
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
                  <ActivityIndicator color="#f59e0b" />
                </View>
              ) : data.length === 0 ? (
                <View className="py-10 items-center">
                  <Ionicons name="cloud-offline-outline" size={40} color="#64748b" />
                  <Text className="text-slate-400 text-[13px] mt-3">No backups found</Text>
                  <TouchableOpacity onPress={() => refetch()} className="mt-3">
                    <Text className="text-amber-400 text-[12px] font-semibold">Refresh</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-2">
                  {data.map((file) => (
                    <TouchableOpacity
                      key={file.driveFileId}
                      onPress={() => setSelected(file)}
                      className="flex-row items-center justify-between bg-white/[0.035] border border-white/10 rounded-xl px-4 py-3.5"
                    >
                      <View>
                        <Text className="text-white text-[13px] font-semibold">
                          {formatDate(file.createdAt)}
                        </Text>
                        <Text className="text-slate-400 text-[11px] mt-0.5">
                          {formatSize(file.sizeBytes)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#64748b" />
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
