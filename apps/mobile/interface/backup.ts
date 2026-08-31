export type BackupStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface BackupSettingsInterface {
  auto_backup_enabled: boolean;
  encryption_enabled: boolean;
  google_account_email: string | null;
  last_backup_at: string | null;
  last_backup_status: BackupStatus | null;
  last_backup_error: string | null;
}

export interface BackupMetadataInterface {
  id: number;
  drive_file_id: string | null;
  filename: string;
  schema_version: number;
  app_version: string;
  size_bytes: number;
  encrypted: boolean;
  status: BackupStatus;
  error_message: string | null;
  created_at: string;
}

/** A backup file as seen on Google Drive, independent of our local metadata mirror. */
export interface DriveBackupFile {
  driveFileId: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
}
