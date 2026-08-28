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

/** ISO 8601 week number, used to bucket backups into "one per week" for retention. */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad(weekNum)}`;
}

function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export interface RetentionConfig {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface RetentionCandidate {
  id: string;
  createdAt: Date;
}

/**
 * Grandfather-father-son retention: keeps the most recent backup per
 * calendar day for the `daily` window, then the most recent per ISO week for
 * the next `weekly` window, then the most recent per calendar month for the
 * next `monthly` window. Everything else is marked for deletion. Backups
 * are never deleted outside this scope (e.g. by re-derived criteria), so a
 * backup only ever leaves the "keep" set by aging out of all three windows.
 */
export function computeRetention(
  backups: RetentionCandidate[],
  config: RetentionConfig,
): { keep: string[]; remove: string[] } {
  const sorted = [...backups].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const keep = new Set<string>();

  // Runs one tier (day/week/month). A period already represented by a
  // backup kept in an earlier, finer-grained tier is treated as already
  // covered — skipped without consuming this tier's quota — so e.g. a
  // second backup from a day already covered by the daily tier can't also
  // eat into the weekly quota for that same week.
  function runTier(periodKeyOf: (d: Date) => string, quota: number) {
    const alreadyCovered = new Set<string>();
    for (const backup of sorted) {
      if (keep.has(backup.id)) alreadyCovered.add(periodKeyOf(backup.createdAt));
    }

    const claimed = new Set<string>();
    for (const backup of sorted) {
      if (keep.has(backup.id)) continue;
      const period = periodKeyOf(backup.createdAt);
      if (alreadyCovered.has(period) || claimed.has(period)) continue;
      if (claimed.size >= quota) break;
      claimed.add(period);
      keep.add(backup.id);
    }
  }

  runTier(dayKey, config.daily);
  runTier(isoWeekKey, config.weekly);
  runTier(monthKey, config.monthly);

  const remove = sorted.filter((b) => !keep.has(b.id)).map((b) => b.id);
  return { keep: Array.from(keep), remove };
}
