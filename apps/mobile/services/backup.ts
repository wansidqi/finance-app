import { BackupMetadataInterface, DriveBackupFile } from "@/interface/backup";
import {
  deleteBackupMetadata,
  getBackupHistory,
  getBackupSettings,
  recordBackupAttempt,
  updateBackupSettings,
} from "@/local/backup-service";
import { CURRENT_SCHEMA_VERSION, DB_NAME, checkpointWal, closeDb, getDb } from "@/local/db";
import Constants from "expo-constants";
import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { decryptBytes, encryptBytes, generateIv, getOrCreateEncryptionKey } from "./backup-encryption";
import { computeRetention, formatBackupFilename, parseBackupFilename } from "./backup-naming";
import {
  deleteBackupFile,
  downloadBackupFile,
  listBackupFiles,
  uploadBackupFile,
} from "./google-drive-client";

const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

// Scratch space for snapshots/downloads in progress — cleared as each
// operation finishes, never relied on to persist across app restarts.
const SCRATCH_DIR = new Directory(Paths.cache, "backup-scratch");
// A single, overwritten-in-place safety copy of the pre-restore database —
// kept (not scratch) so a botched restore is still recoverable by hand.
const SAFETY_DIR = new Directory(Paths.document, "backup-safety");
const SAFETY_SNAPSHOT_NAME = "pre-restore-safety.sqlite";
// expo-sqlite's own `defaultDatabaseDirectory` returns a plain filesystem
// path (no `file://` scheme), which the new File/Directory API rejects as
// "URI is not absolute" — build the equivalent path ourselves instead,
// matching expo-sqlite's documented default location.
const SQLITE_DIR = new Directory(Paths.document, "SQLite");

function ensureDir(dir: Directory) {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
}

function deleteQuietly(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // best-effort cleanup — leaving a stray scratch file behind is harmless
  }
}

function liveDbFile(): File {
  return new File(SQLITE_DIR, DB_NAME);
}

/**
 * Flushes pending WAL writes and copies the live database into a fresh
 * snapshot file, so the rest of a backup/restore flow can work against a
 * stable copy instead of a file that could change mid-operation.
 */
async function createSnapshot(destination: Directory, filename: string): Promise<File> {
  await checkpointWal();
  ensureDir(destination);

  const snapshot = new File(destination, filename);
  deleteQuietly(snapshot);
  liveDbFile().copy(snapshot);
  return snapshot;
}

/**
 * Runs the full "Backup Now" flow: snapshot the live database, optionally
 * encrypt it, upload it to the app's hidden Drive folder, record the
 * attempt locally, and prune old backups per the retention settings.
 */
export async function backupNow(): Promise<BackupMetadataInterface> {
  const settings = await getBackupSettings();
  const now = new Date();
  const filename = formatBackupFilename(now, settings.encryption_enabled);

  let snapshot: File | null = null;
  let uploadFile: File | null = null;

  try {
    snapshot = await createSnapshot(SCRATCH_DIR, `snapshot-${Date.now()}.sqlite`);

    if (settings.encryption_enabled) {
      const key = await getOrCreateEncryptionKey();
      const iv = await generateIv();
      const encrypted = encryptBytes(await snapshot.bytes(), key, iv);
      uploadFile = new File(SCRATCH_DIR, filename);
      deleteQuietly(uploadFile);
      uploadFile.write(encrypted);
    } else {
      uploadFile = new File(SCRATCH_DIR, filename);
      deleteQuietly(uploadFile);
      snapshot.copy(uploadFile);
    }

    const driveFileId = await uploadBackupFile(
      uploadFile,
      settings.encryption_enabled ? "application/octet-stream" : "application/x-sqlite3",
    );

    const metadata = await recordBackupAttempt({
      drive_file_id: driveFileId,
      filename,
      schema_version: CURRENT_SCHEMA_VERSION,
      app_version: APP_VERSION,
      size_bytes: uploadFile.size,
      encrypted: settings.encryption_enabled,
      status: "SUCCESS",
      error_message: null,
    });

    await updateBackupSettings({
      last_backup_at: now.toISOString(),
      last_backup_status: "SUCCESS",
      last_backup_error: null,
    });

    await pruneRetention();
    return metadata;
  } catch (err: any) {
    const message = err?.message ?? "Backup failed";
    await recordBackupAttempt({
      drive_file_id: null,
      filename,
      schema_version: CURRENT_SCHEMA_VERSION,
      app_version: APP_VERSION,
      size_bytes: 0,
      encrypted: settings.encryption_enabled,
      status: "FAILED",
      error_message: message,
    });
    await updateBackupSettings({ last_backup_status: "FAILED", last_backup_error: message });
    throw err;
  } finally {
    if (snapshot) deleteQuietly(snapshot);
    if (uploadFile) deleteQuietly(uploadFile);
  }
}

/** Deletes Drive backups (and their local metadata mirror) that have aged out of the configured daily/weekly/monthly retention windows. */
export async function pruneRetention(): Promise<void> {
  const settings = await getBackupSettings();
  const driveFiles = await listBackupFiles();

  const candidates = driveFiles
    .map((f) => {
      const parsed = parseBackupFilename(f.filename);
      return parsed ? { id: f.driveFileId, createdAt: parsed.createdAt } : null;
    })
    .filter((c): c is { id: string; createdAt: Date } => c !== null);

  const { remove } = computeRetention(candidates, {
    daily: settings.retention_daily,
    weekly: settings.retention_weekly,
    monthly: settings.retention_monthly,
  });

  for (const driveFileId of remove) {
    await deleteBackupFile(driveFileId).catch(() => {});
  }

  const history = await getBackupHistory();
  for (const entry of history) {
    if (entry.drive_file_id && remove.includes(entry.drive_file_id)) {
      await deleteBackupMetadata(entry.id);
    }
  }
}

export async function listAvailableBackups(): Promise<DriveBackupFile[]> {
  return listBackupFiles();
}

/**
 * Downloads, decrypts (if needed), and validates a Drive backup, then
 * replaces the live database with it. A safety snapshot of the
 * pre-restore database is kept at a fixed path so a bad restore is still
 * recoverable by hand. Throws (without touching the live database) if the
 * backup fails integrity validation or needs a newer app version than is
 * currently installed.
 */
export async function restoreFromBackup(driveFileId: string): Promise<void> {
  ensureDir(SCRATCH_DIR);

  const downloadTarget = new File(SCRATCH_DIR, `restore-download-${Date.now()}`);
  deleteQuietly(downloadTarget);

  let decryptedFile: File | null = null;
  let candidateInDbDir: File | null = null;

  try {
    const downloaded = await downloadBackupFile(driveFileId, downloadTarget);

    const driveFiles = await listBackupFiles();
    const matchedFilename = driveFiles.find((f) => f.driveFileId === driveFileId)?.filename ?? "";
    const parsed = parseBackupFilename(matchedFilename);
    const encrypted = parsed?.encrypted ?? false;

    const rawBytes = await downloaded.bytes();
    const plainBytes = encrypted
      ? decryptBytes(rawBytes, await getOrCreateEncryptionKey())
      : rawBytes;

    decryptedFile = new File(SCRATCH_DIR, `restore-decrypted-${Date.now()}.sqlite`);
    deleteQuietly(decryptedFile);
    decryptedFile.write(plainBytes);

    // Validate as a real SQLite connection — must live in expo-sqlite's own
    // database directory for openDatabaseAsync to find it by name.
    candidateInDbDir = new File(SQLITE_DIR, "restore-candidate.db");
    deleteQuietly(candidateInDbDir);
    decryptedFile.copy(candidateInDbDir);

    const candidateDb = await SQLite.openDatabaseAsync("restore-candidate.db");
    let schemaVersion: number;
    try {
      let integrity: { integrity_check: string } | null;
      try {
        integrity = await candidateDb.getFirstAsync<{ integrity_check: string }>(
          "PRAGMA integrity_check",
        );
      } catch {
        // expo-sqlite can't even parse the file as SQLite — the classic
        // cause is a wrong encryption key turning it into random bytes.
        throw new Error(
          encrypted
            ? "Couldn't decrypt this backup. If it was made on a different device (or after reinstalling), import that device's recovery key first — Backup & Restore → View / Import Recovery Key — then try again."
            : "This backup file is corrupted and can't be read.",
        );
      }
      if (!integrity || integrity.integrity_check !== "ok") {
        throw new Error("This backup failed integrity validation — it may be corrupted.");
      }
      const versionRow = await candidateDb.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
      );
      schemaVersion = versionRow?.user_version ?? 0;
    } finally {
      await candidateDb.closeAsync();
    }

    if (schemaVersion > CURRENT_SCHEMA_VERSION) {
      throw new Error(
        `This backup needs a newer app version (schema v${schemaVersion}) than is currently installed (v${CURRENT_SCHEMA_VERSION}). Update the app before restoring it.`,
      );
    }

    // Everything validated — keep a safety copy of what's about to be
    // overwritten before touching the live file.
    ensureDir(SAFETY_DIR);
    await createSnapshot(SAFETY_DIR, SAFETY_SNAPSHOT_NAME);

    await closeDb();
    for (const suffix of ["", "-wal", "-shm"]) {
      deleteQuietly(new File(SQLITE_DIR, `${DB_NAME}${suffix}`));
    }
    candidateInDbDir.copy(liveDbFile());

    // Reopens with the restored file — SCHEMA (idempotent CREATE TABLE IF
    // NOT EXISTS) plus migrate() bring an older backup's schema current.
    await getDb();
  } finally {
    deleteQuietly(downloadTarget);
    if (decryptedFile) deleteQuietly(decryptedFile);
    if (candidateInDbDir) deleteQuietly(candidateInDbDir);
  }
}
