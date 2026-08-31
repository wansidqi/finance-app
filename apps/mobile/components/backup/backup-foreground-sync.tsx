import { backupNow } from "@/services/backup";
import { shouldBackupNow } from "@/services/backup-background-task";
import { useEffect, useRef } from "react";

/**
 * Catches up on a missed automatic backup at cold launch, independent of
 * whether the user ever opens the Backup & Restore screen — mirrors
 * `StateNisabSync`'s rationale.
 *
 * The OS-scheduled background task (`registerBackupBackgroundTask`) is only
 * a best-effort floor — Android Doze/App Standby and iOS's BGTaskScheduler
 * can both defer or skip a scheduled run for a day or more if the app isn't
 * opened often, especially right after install before the OS has learned
 * a usage pattern. Running the same overdue-check on every cold launch means
 * a missed overnight run still gets caught the moment the app is next
 * opened, instead of waiting for the next background window.
 */
export function BackupForegroundSync() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (await shouldBackupNow()) {
        await backupNow();
      }
    })().catch((err) => console.warn("Foreground backup catch-up failed", err));
  }, []);

  return null;
}
