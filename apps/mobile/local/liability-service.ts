import { LiabilityInterface, LiabilityPaymentInterface } from "@/interface/liability";
import { SQLiteBindValue } from "expo-sqlite";
import { getDb } from "./db";

// Ported from apps/backend/internal/liability (Go) — keep in sync if that changes.

// How many of the most recent logged payments feed the average — recent
// enough to track a plan's current pattern, long enough to smooth out a
// one-off unusual month.
const AVERAGE_PAYMENT_WINDOW = 6;

interface LiabilityRow {
  id: number;
  user_id: number | null;
  category: string;
  name: string | null;
  total_balance: number | null;
  monthly_payment: number;
  status: string;
  created_at: string;
  updated_at: string | null;
}

interface LiabilityPaymentRow {
  id: number;
  liability_id: number;
  amount: number;
  paid_date: string;
  note: string | null;
  created_at: string;
}

function rowToPaymentDto(row: LiabilityPaymentRow): LiabilityPaymentInterface {
  return {
    id: row.id,
    liability_id: row.liability_id,
    amount: row.amount,
    paid_date: row.paid_date,
    note: row.note,
    created_at: row.created_at,
  };
}

async function getAverageMonthlyPayment(
  liabilityId: number,
  fallback: number,
): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ amount: number }>(
    "SELECT amount FROM liability_payments WHERE liability_id = ? ORDER BY paid_date DESC, id DESC LIMIT ?",
    liabilityId,
    AVERAGE_PAYMENT_WINDOW,
  );
  if (rows.length === 0) return fallback;
  return rows.reduce((sum, r) => sum + r.amount, 0) / rows.length;
}

async function rowToDto(row: LiabilityRow): Promise<LiabilityInterface> {
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
    average_monthly_payment: await getAverageMonthlyPayment(row.id, row.monthly_payment),
    remaining_month: remainingMonth,
    status: row.status as LiabilityInterface["status"],
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function getAllLiabilities(): Promise<LiabilityInterface[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LiabilityRow>(
    "SELECT * FROM liabilities WHERE status = 'ACTIVE'",
  );
  return Promise.all(rows.map(rowToDto));
}

export async function getLiabilityById(id: number): Promise<LiabilityInterface | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LiabilityRow>("SELECT * FROM liabilities WHERE id = ?", id);
  return row ? rowToDto(row) : null;
}

/** Logs an actual payment made against a liability (e.g. this month's variable Shopee/PayLater installment) without touching total_balance — meant for open-ended commitments, not amortizing debt. */
export async function addLiabilityPayment(
  liabilityId: number,
  amount: number,
  paidDate?: string,
  note?: string | null,
): Promise<LiabilityPaymentInterface> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO liability_payments (liability_id, amount, paid_date, note)
     VALUES (?, ?, ?, ?)`,
    liabilityId,
    amount,
    paidDate ?? new Date().toISOString(),
    note ?? null,
  );
  const row = await db.getFirstAsync<LiabilityPaymentRow>(
    "SELECT * FROM liability_payments WHERE id = ?",
    result.lastInsertRowId,
  );
  if (!row) throw new Error("failed to load created payment");
  return rowToPaymentDto(row);
}

export async function getLiabilityPayments(
  liabilityId: number,
): Promise<LiabilityPaymentInterface[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LiabilityPaymentRow>(
    "SELECT * FROM liability_payments WHERE liability_id = ? ORDER BY paid_date DESC, id DESC",
    liabilityId,
  );
  return rows.map(rowToPaymentDto);
}

export async function deleteLiabilityPayment(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM liability_payments WHERE id = ?", id);
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

  if (set.length === 1) return null;

  const db = await getDb();
  await db.runAsync(`UPDATE liabilities SET ${set.join(", ")} WHERE id = ?`, ...params, id);

  return getLiabilityById(id);
}

export async function deleteLiability(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM liabilities WHERE id = ?", id);
}
