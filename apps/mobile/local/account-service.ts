import { AccountInterface } from "@/interface/account";
import { SQLiteBindValue } from "expo-sqlite";
import { getDb } from "./db";

interface AccountRow {
  id: number;
  user_id: number | null;
  name: string;
  type: string;
  institution: string | null;
  balance: number;
  note: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

function rowToDto(row: AccountRow): AccountInterface {
  return {
    id: row.id,
    user_id: row.user_id ?? undefined,
    name: row.name,
    type: row.type as AccountInterface["type"],
    institution: row.institution,
    balance: row.balance,
    note: row.note,
    status: row.status as AccountInterface["status"],
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function getAllAccounts(): Promise<AccountInterface[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AccountRow>(
    "SELECT * FROM accounts ORDER BY status ASC, created_at ASC",
  );
  return rows.map(rowToDto);
}

export async function getAccountById(id: number): Promise<AccountInterface | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AccountRow>("SELECT * FROM accounts WHERE id = ?", id);
  return row ? rowToDto(row) : null;
}

export async function createAccount(
  data: Partial<AccountInterface> & { balance?: number },
): Promise<AccountInterface> {
  if (!data.name) throw new Error("name is required");

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO accounts (user_id, name, type, institution, balance, note, status)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    data.user_id ?? null,
    data.name,
    data.type ?? "bank",
    data.institution ?? null,
    data.balance ?? 0,
    data.note ?? null,
  );

  const created = await getAccountById(result.lastInsertRowId);
  if (!created) throw new Error("failed to load created account");
  return created;
}

/**
 * Updates account metadata. Does not accept `balance` — the balance is a
 * derived running total maintained exclusively by transaction-service as
 * transactions are created/updated/deleted, so editing it directly here
 * would desync it from the transaction history.
 */
export async function updateAccount(
  id: number,
  data: Partial<Omit<AccountInterface, "balance">>,
): Promise<AccountInterface | null> {
  const existing = await getAccountById(id);
  if (!existing) throw new Error("account not found");

  const set: string[] = ["updated_at = CURRENT_TIMESTAMP"];
  const params: SQLiteBindValue[] = [];

  function setField(column: string, value: SQLiteBindValue) {
    set.push(`${column} = ?`);
    params.push(value);
  }

  if (data.name !== undefined) setField("name", data.name);
  if (data.type !== undefined) setField("type", data.type);
  if (data.institution !== undefined) setField("institution", data.institution);
  if (data.note !== undefined) setField("note", data.note);
  if (data.status !== undefined) setField("status", data.status);

  if (set.length === 1) return existing;

  const db = await getDb();
  await db.runAsync(`UPDATE accounts SET ${set.join(", ")} WHERE id = ?`, ...params, id);

  return getAccountById(id);
}

/**
 * Deleting an account cascades to every transaction that touches it,
 * including ones where it was only the transfer destination — the other
 * side of those transfers keeps its already-applied balance effect (money
 * really did leave/enter it), only the deleted account's own row/history
 * disappears.
 */
export async function deleteAccount(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM transactions WHERE account_id = ? OR transfer_account_id = ?", id, id);
  await db.runAsync("DELETE FROM accounts WHERE id = ?", id);
}

export async function setAccountArchived(id: number, archived: boolean): Promise<AccountInterface | null> {
  return updateAccount(id, { status: archived ? "ARCHIVED" : "ACTIVE" });
}

/** Adjusts the stored balance by `delta` (positive or negative) — used only by transaction-service inside a DB transaction. */
export async function adjustAccountBalance(
  db: Awaited<ReturnType<typeof getDb>>,
  id: number,
  delta: number,
): Promise<void> {
  await db.runAsync(
    "UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    delta,
    id,
  );
}
