import { LiabilityInterface } from "@/interface/liability";
import { SQLiteBindValue } from "expo-sqlite";
import { getDb } from "./db";

// Ported from apps/backend/internal/liability (Go) — keep in sync if that changes.

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
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function getAllLiabilities(): Promise<LiabilityInterface[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LiabilityRow>(
    "SELECT * FROM liabilities WHERE status = 'ACTIVE'",
  );
  return rows.map(rowToDto);
}

export async function getLiabilityById(id: number): Promise<LiabilityInterface | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LiabilityRow>("SELECT * FROM liabilities WHERE id = ?", id);
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
