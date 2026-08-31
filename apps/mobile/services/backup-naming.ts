const FILENAME_PREFIX = "FinanceApp-Backup-";
// Tag inserted only for the `development` build so its backups don't mix
// with preview/production ones in the same Drive appDataFolder (Drive's
// `appdata` scope isolates by Google Cloud project + account, not by
// Android package). Preview/production stay untagged for backward
// compatibility with backups already sitting in users' Drive folders.
const DEV_TAG = "DEV-";

function pad(n: number, width = 2) {
  return n.toString().padStart(width, "0");
}

/**
 * `FinanceApp-Backup-2026-08-27-020000.sqlite` (or `.enc` when encrypted) —
 * a predictable, human-readable name so a user poking around their own
 * Drive folder can tell backups apart without opening the app. Development
 * builds get a `FinanceApp-Backup-DEV-...` name instead, so dev and
 * preview/production backups never collide.
 */
export function formatBackupFilename(date: Date, encrypted: boolean, isDev = false): string {
  const datePart = [date.getUTCFullYear(), pad(date.getUTCMonth() + 1), pad(date.getUTCDate())].join(
    "-",
  );
  const timePart = [pad(date.getUTCHours()), pad(date.getUTCMinutes()), pad(date.getUTCSeconds())].join(
    "",
  );
  const ext = encrypted ? "enc" : "sqlite";
  const tag = isDev ? DEV_TAG : "";
  return `${FILENAME_PREFIX}${tag}${datePart}-${timePart}.${ext}`;
}

const FILENAME_PATTERN =
  /^FinanceApp-Backup-(DEV-)?(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})\.(sqlite|enc)$/;

export function parseBackupFilename(
  filename: string,
): { createdAt: Date; encrypted: boolean; isDev: boolean } | null {
  const match = FILENAME_PATTERN.exec(filename);
  if (!match) return null;

  const [, devTag, year, month, day, hour, minute, second, ext] = match;
  const createdAt = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
  );
  return { createdAt, encrypted: ext === "enc", isDev: devTag != null };
}

export interface RetentionCandidate {
  id: string;
  createdAt: Date;
}

/**
 * The app keeps exactly one backup at a time — every successful backup
 * replaces the last. Given all of an environment's Drive backups, this
 * returns every id except the newest, i.e. what should be deleted.
 */
export function selectStaleBackups(backups: RetentionCandidate[]): string[] {
  if (backups.length <= 1) return [];
  const sorted = [...backups].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return sorted.slice(1).map((b) => b.id);
}
