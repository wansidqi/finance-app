import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Switch } from "@/components/ui/switch";
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
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
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
    <View className="flex-1 bg-canvas">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <ScreenHeader variant="back" title="Backup & Restore" onBack={() => router.back()} />

      <ScrollView
        className="px-6 flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Google Drive connection */}
        <Card className="mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="logo-google" size={16} color="#d1e4fa" />
            <Text className="font-sans text-white font-semibold text-[14px]">Google Drive</Text>
          </View>
          {isConnected ? (
            <>
              <Text className="font-sans text-mist text-[12px] mb-3">
                Connected as {settings?.google_account_email}
              </Text>
              <Button
                label={isDisconnecting ? "Disconnecting..." : "Disconnect"}
                variant="outline"
                disabled={isDisconnecting}
                onPress={handleDisconnect}
              />
            </>
          ) : (
            <>
              <Text className="font-sans text-fog text-[12px] mb-3">
                Connect your own Google account to back up your data to a private, hidden folder
                in your Drive. Your data is never sent to any Finance App server.
              </Text>
              <Button
                label={isConnecting ? "Connecting..." : "Connect Google Drive"}
                variant="primary"
                disabled={isConnecting}
                onPress={handleConnect}
              />
            </>
          )}
        </Card>

        {/* Backup status */}
        <Card className="mb-4">
          <Text className="font-sans text-white font-semibold text-[14px] mb-2">Backup Status</Text>
          <Text className="font-sans text-fog text-[12px] mb-1">
            Last backup:{" "}
            {settings?.last_backup_at ? formatDateTime(settings.last_backup_at) : "Never"}
          </Text>
          {settings?.last_backup_status === "FAILED" && (
            <View className="flex-row items-center gap-1.5 mb-2">
              <Ionicons name="alert-circle-outline" size={13} color="#d1e4fa" />
              <Text className="font-sans text-frost text-[11px] flex-1">
                Last attempt failed: {settings.last_backup_error}
              </Text>
            </View>
          )}
          <Button
            label="Backup Now"
            variant="primary"
            disabled={!isConnected || isBackingUp}
            loading={isBackingUp}
            onPress={handleBackupNow}
            className="mt-2"
            icon="cloud-upload-outline"
          />
          <Button
            label="Load Backup"
            variant="outline"
            disabled={!isConnected}
            onPress={() => setRestoreVisible(true)}
            className="mt-2"
          />
        </Card>

        {/* Automatic backup + encryption */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="font-sans text-white font-semibold text-[14px]">Automatic Backup</Text>
              <Text className="font-sans text-fog text-[11px] mt-0.5">
                Once a day, best effort, when connected
              </Text>
            </View>
            <Switch
              value={!!settings?.auto_backup_enabled}
              onValueChange={handleToggleAutoBackup}
              disabled={!isConnected}
            />
          </View>

          <View className="h-px bg-glass-edge mb-4" />

          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 pr-3">
              <Text className="font-sans text-white font-semibold text-[14px]">Encrypt Backups</Text>
              <Text className="font-sans text-fog text-[11px] mt-0.5">
                AES-256, key stays on this device
              </Text>
            </View>
            <Switch
              value={!!settings?.encryption_enabled}
              onValueChange={handleToggleEncryption}
            />
          </View>
          <TouchableOpacity onPress={() => setRecoveryVisible(true)} className="self-start mt-1">
            <Text className="font-sans text-frost text-[12px] font-semibold">
              View / Import Recovery Key
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      <RestoreModal visible={restoreVisible} onClose={() => setRestoreVisible(false)} />
      <RecoveryKeyModal visible={recoveryVisible} onClose={() => setRecoveryVisible(false)} />
    </View>
  );
}
