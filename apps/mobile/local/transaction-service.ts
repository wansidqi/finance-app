import { TransactionInterface, TransactionType } from "@/interface/transaction";
import { SQLiteBindValue } from "expo-sqlite";
import { getDb } from "./db";
import { deleteReceiptsByTransaction } from "./receipt-service";

interface TransactionRow {
  id: number;
  type: string;
  amount: number;
  occurred_at: string;
  description: string | null;
  note: string | null;
  tax_relief_category: string | null;
  assessment_year: number | null;
  created_at: string;
  updated_at: string | null;
}

function rowToDto(row: TransactionRow): TransactionInterface {
  return {
    id: row.id,
    type: row.type as TransactionType,
    amount: row.amount,
    occurred_at: row.occurred_at,
    description: row.description,
    note: row.note,
    tax_relief_category: row.tax_relief_category,
    assessment_year: row.assessment_year,
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function getAllTransactions(): Promise<TransactionInterface[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TransactionRow>(
    "SELECT * FROM transactions ORDER BY occurred_at DESC, id DESC",
  );
  return rows.map(rowToDto);
}

export async function getTransactionById(id: number): Promise<TransactionInterface | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TransactionRow>("SELECT * FROM transactions WHERE id = ?", id);
  return row ? rowToDto(row) : null;
}

type CreateInput = {
  type: TransactionType;
  amount: number;
  occurred_at?: string;
  description?: string | null;
  note?: string | null;
  tax_relief_category?: string | null;
  assessment_year?: number | null;
};

function validate(data: CreateInput): void {
  if (!data.amount || data.amount <= 0) throw new Error("amount must be greater than zero");
}

export async function createTransaction(data: CreateInput): Promise<TransactionInterface> {
  validate(data);

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO transactions
       (type, amount, occurred_at, description, note, tax_relief_category, assessment_year)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    data.type,
    data.amount,
    data.occurred_at ?? new Date().toISOString(),
    data.description ?? null,
    data.note ?? null,
    data.tax_relief_category ?? null,
    data.assessment_year ?? null,
  );

  const created = await getTransactionById(result.lastInsertRowId);
  if (!created) throw new Error("failed to load created transaction");
  return created;
}

type UpdateInput = Partial<CreateInput>;

export async function updateTransaction(
  id: number,
  data: UpdateInput,
): Promise<TransactionInterface | null> {
  const existing = await getTransactionById(id);
  if (!existing) throw new Error("transaction not found");

  const merged: CreateInput = {
    type: data.type ?? existing.type,
    amount: data.amount ?? existing.amount,
    occurred_at: data.occurred_at ?? existing.occurred_at,
    description: data.description !== undefined ? data.description : existing.description,
    note: data.note !== undefined ? data.note : existing.note,
    tax_relief_category:
      data.tax_relief_category !== undefined ? data.tax_relief_category : existing.tax_relief_category,
    assessment_year: data.assessment_year !== undefined ? data.assessment_year : existing.assessment_year,
  };
  validate(merged);

  const db = await getDb();
  const set: string[] = ["updated_at = CURRENT_TIMESTAMP"];
  const params: SQLiteBindValue[] = [];
  function setField(column: string, value: SQLiteBindValue) {
    set.push(`${column} = ?`);
    params.push(value);
  }
  setField("type", merged.type);
  setField("amount", merged.amount);
  setField("occurred_at", merged.occurred_at ?? new Date().toISOString());
  setField("description", merged.description ?? null);
  setField("note", merged.note ?? null);
  setField("tax_relief_category", merged.tax_relief_category ?? null);
  setField("assessment_year", merged.assessment_year ?? null);

  await db.runAsync(`UPDATE transactions SET ${set.join(", ")} WHERE id = ?`, ...params, id);

  return getTransactionById(id);
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM transactions WHERE id = ?", id);
  await deleteReceiptsByTransaction(id);
}
