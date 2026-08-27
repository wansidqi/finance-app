import { ReminderInterface } from "@/interface/reminder";
import { SQLiteBindValue } from "expo-sqlite";
import { getDb } from "./db";
import { computeNextDueDate, daysUntilDue } from "./reminder-recurrence";

interface ReminderRow {
  id: number;
  user_id: number | null;
  name: string;
  category: string;
  amount: number;
  recurrence: string;
  recurrence_interval_days: number | null;
  next_due_date: string;
  last_paid_date: string | null;
  note: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

function rowToDto(row: ReminderRow, now: Date): ReminderInterface {
  const dueDate = new Date(row.next_due_date);
  const days = daysUntilDue(dueDate, now);

  return {
    id: row.id,
    user_id: row.user_id ?? undefined,
    name: row.name,
    category: row.category as ReminderInterface["category"],
    amount: row.amount,
    recurrence: row.recurrence as ReminderInterface["recurrence"],
    recurrence_interval_days: row.recurrence_interval_days,
    next_due_date: row.next_due_date,
    last_paid_date: row.last_paid_date,
    note: row.note,
    status: row.status as ReminderInterface["status"],
    days_until_due: days,
    is_overdue: row.status === "ACTIVE" && days < 0,
    is_due_today: row.status === "ACTIVE" && days === 0,
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function getAllReminders(): Promise<ReminderInterface[]> {
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

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO payment_reminders
       (user_id, name, category, amount, recurrence, recurrence_interval_days, next_due_date, note, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    data.user_id ?? null,
    data.name,
    data.category ?? "other",
    data.amount ?? 0,
    data.recurrence ?? "monthly",
    data.recurrence_interval_days ?? null,
    data.next_due_date,
    data.note ?? null,
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
  if (data.category !== undefined) setField("category", data.category);
  if (data.amount !== undefined) setField("amount", data.amount);
  if (data.recurrence !== undefined) setField("recurrence", data.recurrence);
  if (data.recurrence_interval_days !== undefined)
    setField("recurrence_interval_days", data.recurrence_interval_days);
  if (data.next_due_date !== undefined) setField("next_due_date", data.next_due_date);
  if (data.note !== undefined) setField("note", data.note);
  if (data.status !== undefined) setField("status", data.status);

  if (set.length === 1) return existing;

  const db = await getDb();
  await db.runAsync(`UPDATE payment_reminders SET ${set.join(", ")} WHERE id = ?`, ...params, id);

  return getReminderById(id);
}

export async function deleteReminder(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM payment_reminders WHERE id = ?", id);
}

export async function pauseReminder(id: number): Promise<ReminderInterface | null> {
  return updateReminder(id, { status: "PAUSED" });
}

export async function resumeReminder(id: number): Promise<ReminderInterface | null> {
  return updateReminder(id, { status: "ACTIVE" });
}

/**
 * Marks the current cycle paid, then either advances to the next cycle
 * (recurring reminders) or marks the reminder COMPLETED (one-time).
 */
export async function markReminderPaid(
  id: number,
  paidDate?: string,
): Promise<ReminderInterface | null> {
  const existing = await getReminderById(id);
  if (!existing) throw new Error("reminder not found");

  const paidAt = paidDate ?? new Date().toISOString();
  const nextDue = computeNextDueDate(
    new Date(existing.next_due_date),
    existing.recurrence,
    existing.recurrence_interval_days,
  );

  const db = await getDb();
  if (nextDue) {
    await db.runAsync(
      `UPDATE payment_reminders
         SET last_paid_date = ?, next_due_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      paidAt,
      nextDue.toISOString(),
      id,
    );
  } else {
    await db.runAsync(
      `UPDATE payment_reminders
         SET last_paid_date = ?, status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      paidAt,
      id,
    );
  }

  return getReminderById(id);
}
