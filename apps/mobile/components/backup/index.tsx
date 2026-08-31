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
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { RecoveryKeyModal } from "./recovery-key-modal";
import { RestoreModal } from "./restore-modal";

/** A continuously rotating icon — used wherever the UI needs to signal an in-progress async operation (backup upload, etc.) beyond just disabling the button. */
function SpinningIcon({ size, color }: { size: number; color: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Ionicons name="sync-outline" size={size} color={color} />
    </Animated.View>
  );
}

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

  return (
    <View className="flex-1 bg-slate-950">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <View className="flex-row items-center gap-3 px-6 pt-20 pb-6">
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
        keyboardShouldPersistTaps="handled"
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
            className={`mt-2 rounded-lg py-3 flex-row items-center justify-center gap-2 ${
              isConnected ? "bg-amber-500" : "bg-slate-600/30 opacity-50"
            }`}
          >
            {isBackingUp && <SpinningIcon size={15} color="white" />}
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
      </ScrollView>

      <RestoreModal visible={restoreVisible} onClose={() => setRestoreVisible(false)} />
      <RecoveryKeyModal visible={recoveryVisible} onClose={() => setRecoveryVisible(false)} />
    </View>
  );
}
