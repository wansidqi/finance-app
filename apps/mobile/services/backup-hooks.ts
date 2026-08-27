import { BackupSettingsInterface } from "@/interface/backup";
import { getBackupHistory, getBackupSettings, updateBackupSettings } from "@/local/backup-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backupNow, listAvailableBackups, restoreFromBackup } from "./backup";
import { getEncryptionRecoveryKey, importEncryptionRecoveryKey } from "./backup-encryption";
import { connectGoogleDrive, disconnectGoogleDrive } from "./google-drive-client";

const SETTINGS_KEY = ["backup-settings"];
const HISTORY_KEY = ["backup-history"];
const AVAILABLE_KEY = ["backup-available"];
const RECOVERY_KEY_KEY = ["backup-recovery-key"];

export const useBackupSettings = () => {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: getBackupSettings });
};

export const useUpdateBackupSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BackupSettingsInterface>) => updateBackupSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
};

export const useBackupHistory = () => {
  return useQuery({ queryKey: HISTORY_KEY, queryFn: getBackupHistory });
};

export const useAvailableBackups = (enabled: boolean) => {
  return useQuery({ queryKey: AVAILABLE_KEY, queryFn: listAvailableBackups, enabled });
};

export const useConnectGoogleDrive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const email = await connectGoogleDrive();
      await updateBackupSettings({ google_account_email: email });
      return email;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
};

export const useDisconnectGoogleDrive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await disconnectGoogleDrive();
      await updateBackupSettings({
        google_account_email: null,
        auto_backup_enabled: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      queryClient.invalidateQueries({ queryKey: AVAILABLE_KEY });
    },
  });
};

export const useBackupNow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: backupNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: AVAILABLE_KEY });
    },
  });
};

export const useRestoreBackup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (driveFileId: string) => restoreFromBackup(driveFileId),
    onSuccess: () => {
      // The entire on-device database was just replaced — every cached
      // query result across the app (assets, liabilities, zakat, reminders,
      // ...) is now stale, not just backup-related ones.
      queryClient.invalidateQueries();
    },
  });
};

export const useEncryptionRecoveryKey = () => {
  return useQuery({ queryKey: RECOVERY_KEY_KEY, queryFn: getEncryptionRecoveryKey });
};

export const useImportRecoveryKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hexKey: string) => importEncryptionRecoveryKey(hexKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECOVERY_KEY_KEY });
    },
  });
};
