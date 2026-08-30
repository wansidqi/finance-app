import { ReminderInterface, ReminderRecurrence } from "@/interface/reminder";
import { SQLiteBindValue } from "expo-sqlite";
import { clampHour, clampMinute, sanitizeOffsets } from "./reminder-notification-settings-service";
import { getDb } from "./db";
import { computeNextDueDate, daysUntilDue } from "./reminder-recurrence";

// Recurring reminders never need an explicit "mark done" — they just keep
// rolling forward on their own for as long as they're switched on. Caps how
// many cycles a single overdue reminder can catch up in one pass, so a
// corrupted/degenerate recurrence (e.g. a custom interval that somehow
// resolves to ~0 days) can't hang the app in an effectively infinite loop.
const MAX_CATCH_UP_CYCLES = 1000;

/**
 * Rolls every overdue, still-ACTIVE recurring reminder's `next_due_date`
 * forward until it's no longer in the past — one-time reminders are left
 * alone since there's no "next cycle" for them, they just sit overdue until
 * deleted. Handles being overdue by several cycles (e.g. app unopened for
 * months) in one pass.
 */
export async function advanceOverdueRecurringReminders(): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const rows = await db.getAllAsync<{
    id: number;
    recurrence: ReminderRecurrence;
    recurrence_interval_days: number | null;
    next_due_date: string;
  }>(
    `SELECT id, recurrence, recurrence_interval_days, next_due_date
       FROM payment_reminders
      WHERE status = 'ACTIVE'
        AND recurrence != 'one_time'
        AND next_due_date < ?`,
    now.toISOString(),
  );

  for (const row of rows) {
    let due = new Date(row.next_due_date);
    for (let i = 0; i < MAX_CATCH_UP_CYCLES && due.getTime() < now.getTime(); i++) {
      const next = computeNextDueDate(due, row.recurrence, row.recurrence_interval_days);
      if (!next || next.getTime() <= due.getTime()) break;
      due = next;
    }
    await db.runAsync(
      "UPDATE payment_reminders SET next_due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      due.toISOString(),
      row.id,
    );
  }
}

interface ReminderRow {
  id: number;
  user_id: number | null;
  name: string;
  recurrence: string;
  recurrence_interval_days: number | null;
  next_due_date: string;
  last_paid_date: string | null;
  note: string | null;
  status: string;
  notification_mode: string;
  notification_offsets_days: string | null;
  notification_hour: number | null;
  notification_minute: number | null;
  created_at: string;
  updated_at: string | null;
}

function rowToDto(row: ReminderRow, now: Date): ReminderInterface {
  const dueDate = new Date(row.next_due_date);
  const days = daysUntilDue(dueDate, now);

  let offsets: number[] | null = null;
  if (row.notification_mode === "custom" && row.notification_offsets_days) {
    try {
      const parsed = JSON.parse(row.notification_offsets_days);
      offsets = Array.isArray(parsed) ? sanitizeOffsets(parsed) : null;
    } catch {
      offsets = null;
    }
  }

  return {
    id: row.id,
    user_id: row.user_id ?? undefined,
    name: row.name,
    recurrence: row.recurrence as ReminderInterface["recurrence"],
    recurrence_interval_days: row.recurrence_interval_days,
    next_due_date: row.next_due_date,
    last_paid_date: row.last_paid_date,
    note: row.note,
    status: row.status as ReminderInterface["status"],
    notification_mode: row.notification_mode === "custom" ? "custom" : "global",
    notification_offsets_days: offsets,
    notification_hour: row.notification_hour != null ? clampHour(row.notification_hour) : null,
    notification_minute: row.notification_minute != null ? clampMinute(row.notification_minute) : null,
    days_until_due: days,
    is_overdue: row.status === "ACTIVE" && days < 0,
    is_due_today: row.status === "ACTIVE" && days === 0,
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function getAllReminders(): Promise<ReminderInterface[]> {
  await advanceOverdueRecurringReminders();
  const db = await getDb();
  const rows = await db.getAllAsync<ReminderRow>(
    "SELECT * FROM payment_reminders ORDER BY next_due_date ASC",
  );
  const now = new Date();
  return rows.map((row) => rowToDto(row, now));
}

export async function getReminderById(id: number): Promise<ReminderInterface | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ReminderRow>(
    "SELECT * FROM payment_reminders WHERE id = ?",
    id,
  );
  return row ? rowToDto(row, new Date()) : null;
}

export async function createReminder(
  data: Partial<ReminderInterface>,
): Promise<ReminderInterface> {
  if (!data.name) throw new Error("name is required");
  if (!data.next_due_date) throw new Error("next_due_date is required");

  const notificationMode = data.notification_mode === "custom" ? "custom" : "global";

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO payment_reminders
       (user_id, name, recurrence, recurrence_interval_days, next_due_date, note, status,
        notification_mode, notification_offsets_days, notification_hour, notification_minute)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)`,
    data.user_id ?? null,
    data.name,
    data.recurrence ?? "monthly",
    data.recurrence_interval_days ?? null,
    data.next_due_date,
    data.note ?? null,
    notificationMode,
    notificationMode === "custom" && data.notification_offsets_days
      ? JSON.stringify(sanitizeOffsets(data.notification_offsets_days))
      : null,
    notificationMode === "custom" && data.notification_hour != null
      ? clampHour(data.notification_hour)
      : null,
    notificationMode === "custom" && data.notification_minute != null
      ? clampMinute(data.notification_minute)
      : null,
  );

  const created = await getReminderById(result.lastInsertRowId);
  if (!created) throw new Error("failed to load created reminder");
  return created;
}

export async function updateReminder(
  id: number,
  data: Partial<ReminderInterface>,
): Promise<ReminderInterface | null> {
  const existing = await getReminderById(id);
  if (!existing) throw new Error("reminder not found");

  const set: string[] = ["updated_at = CURRENT_TIMESTAMP"];
  const params: SQLiteBindValue[] = [];

  function setField(column: string, value: SQLiteBindValue) {
    set.push(`${column} = ?`);
    params.push(value);
  }

  if (data.name !== undefined) setField("name", data.name);
  if (data.recurrence !== undefined) setField("recurrence", data.recurrence);
  if (data.recurrence_interval_days !== undefined)
    setField("recurrence_interval_days", data.recurrence_interval_days);
  if (data.next_due_date !== undefined) setField("next_due_date", data.next_due_date);
  if (data.note !== undefined) setField("note", data.note);
  if (data.status !== undefined) setField("status", data.status);
  if (data.notification_mode !== undefined) {
    const mode = data.notification_mode === "custom" ? "custom" : "global";
    setField("notification_mode", mode);
    setField(
      "notification_offsets_days",
      mode === "custom" && data.notification_offsets_days
        ? JSON.stringify(sanitizeOffsets(data.notification_offsets_days))
        : null,
    );
    setField(
      "notification_hour",
      mode === "custom" && data.notification_hour != null ? clampHour(data.notification_hour) : null,
    );
    setField(
      "notification_minute",
      mode === "custom" && data.notification_minute != null
        ? clampMinute(data.notification_minute)
        : null,
    );
  }

  if (set.length === 1) return existing;

  const db = await getDb();
  await db.runAsync(`UPDATE payment_reminders SET ${set.join(", ")} WHERE id = ?`, ...params, id);

  return getReminderById(id);
}

export async function deleteReminder(id: number): Promise<void> {
  const db = await getDb();
  // A liability may link to this reminder (see local/liability-service.ts) —
  // clear that reference first so it doesn't dangle if the reminder is
  // deleted directly from the Reminders screen instead of via the liability.
  await db.runAsync("UPDATE liabilities SET reminder_id = NULL WHERE reminder_id = ?", id);
  await db.runAsync("DELETE FROM payment_reminders WHERE id = ?", id);
}

/** Used internally when a liability is paid off (see local/liability-service.ts) — not user-facing. */
export async function pauseReminder(id: number): Promise<ReminderInterface | null> {
  return updateReminder(id, { status: "PAUSED" });
}
