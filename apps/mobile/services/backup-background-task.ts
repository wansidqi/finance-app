import { getBackupSettings } from "@/local/backup-service";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { backupNow } from "./backup";
import { isGoogleDriveConnected } from "./google-drive-client";

export const BACKUP_BACKGROUND_TASK = "finance-backup-background-sync";

// Roughly "once a day" without depending on landing exactly at 2am — the OS
// only guarantees a floor on how often this runs at all (see
// registerBackupBackgroundTask below), so a wall-clock target time isn't
// reliably hittable anyway. Instead: back up once at least this many hours
// have passed since the last successful one, which self-corrects if a run
// was missed (sick device, no network, task delayed by the OS, etc.)
// without ever backing up more than once in a ~day.
const MIN_HOURS_BETWEEN_BACKUPS = 20;

async function shouldBackupNow(): Promise<boolean> {
  const settings = await getBackupSettings();
  if (!settings.auto_backup_enabled) return false;
  if (!isGoogleDriveConnected()) return false;

  if (!settings.last_backup_at) return true;

  const hoursSinceLastBackup =
    (Date.now() - new Date(settings.last_backup_at).getTime()) / (1000 * 60 * 60);
  return hoursSinceLastBackup >= MIN_HOURS_BETWEEN_BACKUPS;
}

// Must run at module load — see zakat-background-task.ts, which this mirrors.
TaskManager.defineTask(BACKUP_BACKGROUND_TASK, async () => {
  try {
    if (!(await shouldBackupNow())) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    await backupNow();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (err) {
    console.warn("Automatic backup failed", err);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Registers the periodic background check, if it isn't already registered.
 * Safe to call on every app start — registration persists across restarts.
 */
export async function registerBackupBackgroundTask() {
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(BACKUP_BACKGROUND_TASK);
  if (alreadyRegistered) return;

  await BackgroundTask.registerTaskAsync(BACKUP_BACKGROUND_TASK, {
    // Checked more often than the ~20h backup threshold so a missed
    // overnight run still gets picked up well within the same day. Still
    // only a floor — the OS treats this as best-effort, same as the other
    // background tasks in this app.
    minimumInterval: 6 * 60,
  });
}

/**
 * Manually fires the background task right now, for testing — only works
 * in a debug/dev-client build, per expo-background-task's own docs.
 */
export async function triggerBackupBackgroundTaskForTesting() {
  return BackgroundTask.triggerTaskWorkerForTestingAsync();
}
