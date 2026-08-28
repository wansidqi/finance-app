import { ReminderNotificationSettingsInterface } from "@/interface/reminder";
import { getDb } from "./db";

export const DEFAULT_REMINDER_OFFSETS_DAYS = [7, 3, 1, 0];
export const DEFAULT_REMINDER_HOUR = 9;
export const DEFAULT_REMINDER_MINUTE = 0;

interface SettingsRow {
  mode: string;
  custom_offsets_days: string | null;
  custom_hour: number | null;
  custom_minute: number | null;
}

/** De-dupes, clamps to non-negative integers, and sorts descending (largest offset first). */
export function sanitizeOffsets(offsets: number[]): number[] {
  const clean = Array.from(new Set(offsets.map((o) => Math.max(0, Math.trunc(o)))));
  clean.sort((a, b) => b - a);
  return clean.length > 0 ? clean : DEFAULT_REMINDER_OFFSETS_DAYS;
}

export function clampHour(hour: number): number {
  return Math.min(23, Math.max(0, Math.trunc(hour)));
}

export function clampMinute(minute: number): number {
  return Math.min(59, Math.max(0, Math.trunc(minute)));
}

function rowToSettings(row: SettingsRow | null): ReminderNotificationSettingsInterface {
  if (row?.mode === "custom" && row.custom_offsets_days) {
    let offsets: number[];
    try {
      const parsed = JSON.parse(row.custom_offsets_days);
      offsets = Array.isArray(parsed) ? parsed : DEFAULT_REMINDER_OFFSETS_DAYS;
    } catch {
      offsets = DEFAULT_REMINDER_OFFSETS_DAYS;
    }
    return {
      mode: "custom",
      offsets_days: sanitizeOffsets(offsets),
      hour: row.custom_hour != null ? clampHour(row.custom_hour) : DEFAULT_REMINDER_HOUR,
      minute: row.custom_minute != null ? clampMinute(row.custom_minute) : DEFAULT_REMINDER_MINUTE,
    };
  }

  return {
    mode: "default",
    offsets_days: DEFAULT_REMINDER_OFFSETS_DAYS,
    hour: DEFAULT_REMINDER_HOUR,
    minute: DEFAULT_REMINDER_MINUTE,
  };
}

export async function getReminderNotificationSettings(): Promise<ReminderNotificationSettingsInterface> {
  const db = await getDb();
  const row = await db.getFirstAsync<SettingsRow>(
    "SELECT mode, custom_offsets_days, custom_hour, custom_minute FROM reminder_notification_settings WHERE id = 1",
  );
  return rowToSettings(row);
}

export async function setReminderNotificationSettings(
  mode: "default" | "custom",
  offsetsDays: number[],
  hour: number,
  minute: number,
): Promise<ReminderNotificationSettingsInterface> {
  const db = await getDb();
  const cleanOffsets = sanitizeOffsets(offsetsDays);
  const cleanHour = clampHour(hour);
  const cleanMinute = clampMinute(minute);

  await db.runAsync(
    `INSERT INTO reminder_notification_settings
       (id, mode, custom_offsets_days, custom_hour, custom_minute, updated_at)
     VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       mode = excluded.mode,
       custom_offsets_days = excluded.custom_offsets_days,
       custom_hour = excluded.custom_hour,
       custom_minute = excluded.custom_minute,
       updated_at = CURRENT_TIMESTAMP`,
    mode,
    mode === "custom" ? JSON.stringify(cleanOffsets) : null,
    mode === "custom" ? cleanHour : null,
    mode === "custom" ? cleanMinute : null,
  );

  return getReminderNotificationSettings();
}
