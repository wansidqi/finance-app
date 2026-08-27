import { BackupMetadataInterface, BackupSettingsInterface, BackupStatus } from "@/interface/backup";
import { getDb } from "./db";

interface BackupSettingsRow {
  auto_backup_enabled: number;
  encryption_enabled: number;
  retention_daily: number;
  retention_weekly: number;
  retention_monthly: number;
  google_account_email: string | null;
  last_backup_at: string | null;
  last_backup_status: string | null;
  last_backup_error: string | null;
}

const DEFAULT_SETTINGS: BackupSettingsInterface = {
  auto_backup_enabled: false,
  encryption_enabled: false,
  retention_daily: 30,
  retention_weekly: 12,
  retention_monthly: 12,
  google_account_email: null,
  last_backup_at: null,
  last_backup_status: null,
  last_backup_error: null,
};

function rowToSettings(row: BackupSettingsRow | null): BackupSettingsInterface {
  if (!row) return DEFAULT_SETTINGS;
  return {
    auto_backup_enabled: !!row.auto_backup_enabled,
    encryption_enabled: !!row.encryption_enabled,
    retention_daily: row.retention_daily,
    retention_weekly: row.retention_weekly,
    retention_monthly: row.retention_monthly,
    google_account_email: row.google_account_email,
    last_backup_at: row.last_backup_at,
    last_backup_status: row.last_backup_status as BackupStatus | null,
    last_backup_error: row.last_backup_error,
  };
}

export async function getBackupSettings(): Promise<BackupSettingsInterface> {
  const db = await getDb();
  const row = await db.getFirstAsync<BackupSettingsRow>(
    "SELECT * FROM backup_settings WHERE id = 1",
  );
  return rowToSettings(row);
}

export async function updateBackupSettings(
  data: Partial<BackupSettingsInterface>,
): Promise<BackupSettingsInterface> {
  const current = await getBackupSettings();
  const merged: BackupSettingsInterface = { ...current, ...data };

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO backup_settings
       (id, auto_backup_enabled, encryption_enabled, retention_daily, retention_weekly,
        retention_monthly, google_account_email, last_backup_at, last_backup_status,
        last_backup_error, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       auto_backup_enabled = excluded.auto_backup_enabled,
       encryption_enabled = excluded.encryption_enabled,
       retention_daily = excluded.retention_daily,
       retention_weekly = excluded.retention_weekly,
       retention_monthly = excluded.retention_monthly,
       google_account_email = excluded.google_account_email,
       last_backup_at = excluded.last_backup_at,
       last_backup_status = excluded.last_backup_status,
       last_backup_error = excluded.last_backup_error,
       updated_at = CURRENT_TIMESTAMP`,
    merged.auto_backup_enabled ? 1 : 0,
    merged.encryption_enabled ? 1 : 0,
    merged.retention_daily,
    merged.retention_weekly,
    merged.retention_monthly,
    merged.google_account_email,
    merged.last_backup_at,
    merged.last_backup_status,
    merged.last_backup_error,
  );

  return merged;
}

interface BackupMetadataRow {
  id: number;
  drive_file_id: string | null;
  filename: string;
  schema_version: number;
  app_version: string;
  size_bytes: number;
  encrypted: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

function rowToMetadata(row: BackupMetadataRow): BackupMetadataInterface {
  return {
    id: row.id,
    drive_file_id: row.drive_file_id,
    filename: row.filename,
    schema_version: row.schema_version,
    app_version: row.app_version,
    size_bytes: row.size_bytes,
    encrypted: !!row.encrypted,
    status: row.status as BackupStatus,
    error_message: row.error_message,
    created_at: row.created_at,
  };
}

export async function getBackupHistory(): Promise<BackupMetadataInterface[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BackupMetadataRow>(
    "SELECT * FROM backup_metadata ORDER BY created_at DESC",
  );
  return rows.map(rowToMetadata);
}

export async function recordBackupAttempt(
  data: Omit<BackupMetadataInterface, "id" | "created_at">,
): Promise<BackupMetadataInterface> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO backup_metadata
       (drive_file_id, filename, schema_version, app_version, size_bytes, encrypted, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    data.drive_file_id,
    data.filename,
    data.schema_version,
    data.app_version,
    data.size_bytes,
    data.encrypted ? 1 : 0,
    data.status,
    data.error_message,
  );

  const row = await db.getFirstAsync<BackupMetadataRow>(
    "SELECT * FROM backup_metadata WHERE id = ?",
    result.lastInsertRowId,
  );
  if (!row) throw new Error("failed to load created backup metadata");
  return rowToMetadata(row);
}

export async function deleteBackupMetadata(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM backup_metadata WHERE id = ?", id);
}
