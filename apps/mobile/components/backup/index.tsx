import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import {
  useBackupNow,
  useBackupSettings,
  useConnectGoogleDrive,
  useDisconnectGoogleDrive,
  useUpdateBackupSettings,
} from "@/services/backup-hooks";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { RecoveryKeyModal } from "./recovery-key-modal";
import { RestoreModal } from "./restore-modal";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Backup() {
  const router = useRouter();
  const { data: settings } = useBackupSettings();
  const { mutateAsync: connect, isPending: isConnecting } = useConnectGoogleDrive();
  const { mutateAsync: disconnect, isPending: isDisconnecting } = useDisconnectGoogleDrive();
  const { mutateAsync: updateSettings } = useUpdateBackupSettings();
  const { mutateAsync: runBackupNow, isPending: isBackingUp } = useBackupNow();

  const { error, isVisible, hideError, showError } = useErrorModal();
  const [restoreVisible, setRestoreVisible] = useState(false);
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [retentionDraft, setRetentionDraft] = useState<{
    daily: string;
    weekly: string;
    monthly: string;
  } | null>(null);

  const isConnected = !!settings?.google_account_email;

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err: any) {
      showError({ message: err?.message ?? "Failed to connect Google Drive" });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err: any) {
      showError({ message: err?.message ?? "Failed to disconnect Google Drive" });
    }
  };

  const handleBackupNow = async () => {
    try {
      await runBackupNow();
    } catch (err: any) {
      showError({ message: err?.message ?? "Backup failed" });
    }
  };

  const handleToggleAutoBackup = async (value: boolean) => {
    try {
      await updateSettings({ auto_backup_enabled: value });
    } catch (err: any) {
      showError({ message: err?.message ?? "Failed to update setting" });
    }
  };

  const handleToggleEncryption = async (value: boolean) => {
    try {
      await updateSettings({ encryption_enabled: value });
    } catch (err: any) {
      showError({ message: err?.message ?? "Failed to update setting" });
    }
  };

  const startEditingRetention = () => {
    if (!settings) return;
    setRetentionDraft({
      daily: String(settings.retention_daily),
      weekly: String(settings.retention_weekly),
      monthly: String(settings.retention_monthly),
    });
  };

  const saveRetention = async () => {
    if (!retentionDraft) return;
    try {
      await updateSettings({
        retention_daily: Number(retentionDraft.daily) || 0,
        retention_weekly: Number(retentionDraft.weekly) || 0,
        retention_monthly: Number(retentionDraft.monthly) || 0,
      });
      setRetentionDraft(null);
    } catch (err: any) {
      showError({ message: err?.message ?? "Failed to update retention" });
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <View className="flex-row items-center gap-3 px-6 pt-10 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-white/5"
        >
          <Ionicons name="chevron-back" size={22} color="#cbd5e1" />
        </TouchableOpacity>
        <Text className="text-[22px] font-bold text-white">Backup & Restore</Text>
      </View>

      <ScrollView
        className="px-6 flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Google Drive connection */}
        <View className="bg-white/[0.035] border border-white/10 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="logo-google" size={16} color="#f59e0b" />
            <Text className="text-white font-semibold text-[14px]">Google Drive</Text>
          </View>
          {isConnected ? (
            <>
              <Text className="text-slate-300 text-[12px] mb-3">
                Connected as {settings?.google_account_email}
              </Text>
              <TouchableOpacity
                onPress={handleDisconnect}
                disabled={isDisconnecting}
                className="self-start bg-white/5 border border-white/10 rounded-lg px-4 py-2"
              >
                <Text className="text-slate-300 text-[12px] font-semibold">
                  {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-slate-400 text-[12px] mb-3">
                Connect your own Google account to back up your data to a private, hidden folder
                in your Drive. Your data is never sent to any Finance App server.
              </Text>
              <TouchableOpacity
                onPress={handleConnect}
                disabled={isConnecting}
                className="self-start bg-amber-500 rounded-lg px-4 py-2.5"
              >
                <Text className="text-white text-[12px] font-semibold">
                  {isConnecting ? "Connecting..." : "Connect Google Drive"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Backup status */}
        <View className="bg-white/[0.035] border border-white/10 rounded-2xl p-4 mb-4">
          <Text className="text-white font-semibold text-[14px] mb-2">Backup Status</Text>
          <Text className="text-slate-400 text-[12px] mb-1">
            Last backup:{" "}
            {settings?.last_backup_at ? formatDateTime(settings.last_backup_at) : "Never"}
          </Text>
          {settings?.last_backup_status === "FAILED" && (
            <Text className="text-red-400 text-[11px] mb-2">
              Last attempt failed: {settings.last_backup_error}
            </Text>
          )}
          <TouchableOpacity
            onPress={handleBackupNow}
            disabled={!isConnected || isBackingUp}
            className={`mt-2 rounded-lg py-3 ${
              isConnected && !isBackingUp ? "bg-amber-500" : "bg-slate-600/30 opacity-50"
            }`}
          >
            <Text className="text-center text-white font-semibold text-[13px]">
              {isBackingUp ? "Backing up..." : "Backup Now"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRestoreVisible(true)}
            disabled={!isConnected}
            className={`mt-2 rounded-lg py-3 border ${
              isConnected ? "border-white/10 bg-white/5" : "border-white/5 opacity-50"
            }`}
          >
            <Text className="text-center text-slate-200 font-semibold text-[13px]">
              Load Backup
            </Text>
          </TouchableOpacity>
        </View>

        {/* Automatic backup + encryption */}
        <View className="bg-white/[0.035] border border-white/10 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-white font-semibold text-[14px]">Automatic Backup</Text>
              <Text className="text-slate-400 text-[11px] mt-0.5">
                Once a day, best effort, when connected
              </Text>
            </View>
            <Switch
              value={!!settings?.auto_backup_enabled}
              onValueChange={handleToggleAutoBackup}
              disabled={!isConnected}
              trackColor={{ true: "#f59e0b" }}
            />
          </View>

          <View className="h-px bg-white/10 mb-4" />

          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 pr-3">
              <Text className="text-white font-semibold text-[14px]">Encrypt Backups</Text>
              <Text className="text-slate-400 text-[11px] mt-0.5">
                AES-256, key stays on this device
              </Text>
            </View>
            <Switch
              value={!!settings?.encryption_enabled}
              onValueChange={handleToggleEncryption}
              trackColor={{ true: "#f59e0b" }}
            />
          </View>
          <TouchableOpacity onPress={() => setRecoveryVisible(true)} className="self-start mt-1">
            <Text className="text-amber-400 text-[12px] font-semibold">
              View / Import Recovery Key
            </Text>
          </TouchableOpacity>
        </View>

        {/* Retention */}
        <View className="bg-white/[0.035] border border-white/10 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-semibold text-[14px]">Retention</Text>
            {!retentionDraft && (
              <TouchableOpacity onPress={startEditingRetention}>
                <Text className="text-amber-400 text-[12px] font-semibold">Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {retentionDraft ? (
            <>
              <View className="flex-row gap-3 mb-3">
                <RetentionField
                  label="Daily"
                  value={retentionDraft.daily}
                  onChange={(v) => setRetentionDraft({ ...retentionDraft, daily: v })}
                />
                <RetentionField
                  label="Weekly"
                  value={retentionDraft.weekly}
                  onChange={(v) => setRetentionDraft({ ...retentionDraft, weekly: v })}
                />
                <RetentionField
                  label="Monthly"
                  value={retentionDraft.monthly}
                  onChange={(v) => setRetentionDraft({ ...retentionDraft, monthly: v })}
                />
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setRetentionDraft(null)}
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg py-2.5"
                >
                  <Text className="text-center text-slate-200 font-semibold text-[12px]">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveRetention}
                  className="flex-1 bg-amber-500 rounded-lg py-2.5"
                >
                  <Text className="text-center text-white font-semibold text-[12px]">Save</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text className="text-slate-400 text-[12px]">
              Keep {settings?.retention_daily ?? 30} daily · {settings?.retention_weekly ?? 12}{" "}
              weekly · {settings?.retention_monthly ?? 12} monthly backups
            </Text>
          )}
        </View>
      </ScrollView>

      <RestoreModal visible={restoreVisible} onClose={() => setRestoreVisible(false)} />
      <RecoveryKeyModal visible={recoveryVisible} onClose={() => setRecoveryVisible(false)} />
    </View>
  );
}

function RetentionField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        className="bg-slate-700/30 border border-slate-600 rounded-lg px-2 py-2.5 text-white text-center text-[13px]"
      />
    </View>
  );
}
