import { LiabilityInterface } from "@/interface/liability";
import { SQLiteBindValue } from "expo-sqlite";
import { getDb } from "./db";
import {
  advanceOverdueRecurringReminders,
  createReminder,
  deleteReminder,
  pauseReminder,
  updateReminder,
} from "./reminder-service";

// Ported from apps/backend/internal/liability (Go) — keep in sync if that changes.

interface LiabilityRow {
  id: number;
  user_id: number | null;
  category: string;
  name: string | null;
  total_balance: number | null;
  monthly_payment: number;
  status: string;
  reminder_id: number | null;
  reminder_due_date: string | null;
  reminder_status: string | null;
  created_at: string;
  updated_at: string | null;
}

const SELECT_LIABILITY = `
  SELECT liabilities.*,
         payment_reminders.next_due_date AS reminder_due_date,
         payment_reminders.status AS reminder_status
  FROM liabilities
  LEFT JOIN payment_reminders ON payment_reminders.id = liabilities.reminder_id
`;

function rowToDto(row: LiabilityRow): LiabilityInterface {
  const totalBalance = row.total_balance ?? 0;
  const remainingMonth =
    totalBalance !== 0 && row.monthly_payment !== 0
      ? Math.ceil(totalBalance / row.monthly_payment)
      : 0;

  return {
    id: row.id,
    user_id: row.user_id ?? undefined,
    category: row.category as LiabilityInterface["category"],
    name: row.name ?? "",
    total_balance: row.total_balance,
    monthly_payment: row.monthly_payment,
    remaining_month: remainingMonth,
    status: row.status as LiabilityInterface["status"],
    reminder_id: row.reminder_id,
    reminder_due_date: row.reminder_due_date,
    reminder_status: row.reminder_status as LiabilityInterface["reminder_status"],
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function getAllLiabilities(): Promise<LiabilityInterface[]> {
  await advanceOverdueRecurringReminders();
  const db = await getDb();
  const rows = await db.getAllAsync<LiabilityRow>(
    `${SELECT_LIABILITY} WHERE liabilities.status = 'ACTIVE'`,
  );
  return rows.map(rowToDto);
}

export async function getLiabilityById(id: number): Promise<LiabilityInterface | null> {
  await advanceOverdueRecurringReminders();
  const db = await getDb();
  const row = await db.getFirstAsync<LiabilityRow>(
    `${SELECT_LIABILITY} WHERE liabilities.id = ?`,
    id,
  );
  return row ? rowToDto(row) : null;
}

export async function createLiability(
  data: Partial<LiabilityInterface>,
): Promise<LiabilityInterface> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO liabilities (user_id, name, category, total_balance, monthly_payment, status)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
    data.user_id ?? null,
    data.name ?? null,
    data.category ?? "",
    data.total_balance ?? 0,
    data.monthly_payment ?? 0,
  );

  if (data.reminder_due_date) {
    const reminder = await createReminder({
      name: `${data.name ?? "Liability"} Payment`,
      recurrence: "monthly",
      next_due_date: data.reminder_due_date,
      note: "Liability payment reminder",
    });
    await db.runAsync(
      "UPDATE liabilities SET reminder_id = ? WHERE id = ?",
      reminder.id,
      result.lastInsertRowId,
    );
  }

  const created = await getLiabilityById(result.lastInsertRowId);
  if (!created) throw new Error("failed to load created liability");
  return created;
}

export async function updateLiability(
  id: number,
  data: Partial<LiabilityInterface>,
): Promise<LiabilityInterface | null> {
  const existing = await getLiabilityById(id);
  if (!existing) throw new Error("liability not found");

  const set: string[] = ["updated_at = CURRENT_TIMESTAMP"];
  const params: SQLiteBindValue[] = [];

  function setField(column: string, value: SQLiteBindValue) {
    set.push(`${column} = ?`);
    params.push(value);
  }

  if (data.category !== undefined) setField("category", data.category);
  if (data.monthly_payment !== undefined) setField("monthly_payment", data.monthly_payment);
  if (data.name !== undefined) setField("name", data.name);
  if (data.status !== undefined) setField("status", data.status);
  if (data.total_balance !== undefined) setField("total_balance", data.total_balance);

  // A paid-off liability drops off the active list with no way back to its
  // detail page, so its reminder would otherwise keep firing monthly forever
  // with nothing pointing at it. Pausing (not deleting) keeps history and
  // lets a future "reactivate" flow resume it if one is ever added.
  if (data.status === "INACTIVE" && existing.reminder_id) {
    await pauseReminder(existing.reminder_id);
  }

  if (data.reminder_due_date !== undefined) {
    if (data.reminder_due_date === null) {
      if (existing.reminder_id) await deleteReminder(existing.reminder_id);
      setField("reminder_id", null);
    } else if (existing.reminder_id) {
      await updateReminder(existing.reminder_id, {
        next_due_date: data.reminder_due_date,
        status: "ACTIVE",
      });
    } else {
      const reminder = await createReminder({
        name: `${data.name ?? existing.name ?? "Liability"} Payment`,
        recurrence: "monthly",
        next_due_date: data.reminder_due_date,
        note: "Liability payment reminder",
      });
      setField("reminder_id", reminder.id);
    }
  }

  if (set.length === 1) return existing;

  const db = await getDb();
  await db.runAsync(`UPDATE liabilities SET ${set.join(", ")} WHERE id = ?`, ...params, id);

  return getLiabilityById(id);
}

export async function deleteLiability(id: number): Promise<void> {
  const existing = await getLiabilityById(id);
  if (existing?.reminder_id) await deleteReminder(existing.reminder_id);

  const db = await getDb();
  await db.runAsync("DELETE FROM liabilities WHERE id = ?", id);
}
