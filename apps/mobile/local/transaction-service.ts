import { TransactionInterface, TransactionType } from "@/interface/transaction";
import { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";
import { adjustAccountBalance, getAccountById } from "./account-service";
import { getDb } from "./db";
import { deleteReceiptsByTransaction } from "./receipt-service";
import { primaryAccountDelta } from "./transaction-effect";

interface TransactionRow {
  id: number;
  account_id: number;
  transfer_account_id: number | null;
  type: string;
  amount: number;
  occurred_at: string;
  description: string | null;
  note: string | null;
  created_at: string;
  updated_at: string | null;
  account_name: string;
  transfer_account_name: string | null;
}

const SELECT_WITH_NAMES = `
  SELECT
    t.*,
    a.name AS account_name,
    ta.name AS transfer_account_name
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  LEFT JOIN accounts ta ON ta.id = t.transfer_account_id
`;

function rowToDto(row: TransactionRow): TransactionInterface {
  return {
    id: row.id,
    account_id: row.account_id,
    transfer_account_id: row.transfer_account_id,
    type: row.type as TransactionType,
    amount: row.amount,
    occurred_at: row.occurred_at,
    description: row.description,
    note: row.note,
    account_name: row.account_name,
    transfer_account_name: row.transfer_account_name,
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function getTransactionsByAccount(accountId: number): Promise<TransactionInterface[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TransactionRow>(
    `${SELECT_WITH_NAMES} WHERE t.account_id = ? OR t.transfer_account_id = ? ORDER BY t.occurred_at DESC, t.id DESC`,
    accountId,
    accountId,
  );
  return rows.map(rowToDto);
}

export async function getTransactionById(id: number): Promise<TransactionInterface | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TransactionRow>(`${SELECT_WITH_NAMES} WHERE t.id = ?`, id);
  return row ? rowToDto(row) : null;
}

/** Applies (sign=1) or reverses (sign=-1) a transaction's effect on the account balance(s) it touches. */
async function applyEffect(
  txn: SQLiteDatabase,
  row: Pick<TransactionRow, "account_id" | "transfer_account_id" | "type" | "amount">,
  sign: 1 | -1,
): Promise<void> {
  const type = row.type as TransactionType;
  await adjustAccountBalance(txn, row.account_id, sign * primaryAccountDelta(type, row.amount));
  if (type === "transfer" && row.transfer_account_id != null) {
    await adjustAccountBalance(txn, row.transfer_account_id, sign * row.amount);
  }
}

type CreateInput = {
  account_id: number;
  transfer_account_id?: number | null;
  type: TransactionType;
  amount: number;
  occurred_at?: string;
  description?: string | null;
  note?: string | null;
};

async function validate(data: CreateInput): Promise<void> {
  if (!data.amount || data.amount <= 0) throw new Error("amount must be greater than zero");
  if (!(await getAccountById(data.account_id))) throw new Error("account not found");

  if (data.type === "transfer") {
    if (!data.transfer_account_id) throw new Error("transfer destination account is required");
    if (data.transfer_account_id === data.account_id)
      throw new Error("transfer destination must differ from the source account");
    if (!(await getAccountById(data.transfer_account_id)))
      throw new Error("transfer destination account not found");
  }
}

export async function createTransaction(data: CreateInput): Promise<TransactionInterface> {
  await validate(data);

  const db = await getDb();
  let insertedId = 0;

  await db.withExclusiveTransactionAsync(async (txn) => {
    const result = await txn.runAsync(
      `INSERT INTO transactions
         (account_id, transfer_account_id, type, amount, occurred_at, description, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      data.account_id,
      data.type === "transfer" ? (data.transfer_account_id ?? null) : null,
      data.type,
      data.amount,
      data.occurred_at ?? new Date().toISOString(),
      data.description ?? null,
      data.note ?? null,
    );
    insertedId = result.lastInsertRowId;
    await applyEffect(
      txn,
      {
        account_id: data.account_id,
        transfer_account_id: data.type === "transfer" ? (data.transfer_account_id ?? null) : null,
        type: data.type,
        amount: data.amount,
      },
      1,
    );
  });

  const created = await getTransactionById(insertedId);
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
    account_id: data.account_id ?? existing.account_id,
    transfer_account_id:
      data.transfer_account_id !== undefined ? data.transfer_account_id : existing.transfer_account_id,
    type: data.type ?? existing.type,
    amount: data.amount ?? existing.amount,
    occurred_at: data.occurred_at ?? existing.occurred_at,
    description: data.description !== undefined ? data.description : existing.description,
    note: data.note !== undefined ? data.note : existing.note,
  };
  await validate(merged);

  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    // Undo the old effect before writing new field values / applying the new effect.
    await applyEffect(
      txn,
      {
        account_id: existing.account_id,
        transfer_account_id: existing.transfer_account_id,
        type: existing.type,
        amount: existing.amount,
      },
      -1,
    );

    const set: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const params: SQLiteBindValue[] = [];
    function setField(column: string, value: SQLiteBindValue) {
      set.push(`${column} = ?`);
      params.push(value);
    }
    setField("account_id", merged.account_id);
    setField("transfer_account_id", merged.type === "transfer" ? (merged.transfer_account_id ?? null) : null);
    setField("type", merged.type);
    setField("amount", merged.amount);
    setField("occurred_at", merged.occurred_at ?? new Date().toISOString());
    setField("description", merged.description ?? null);
    setField("note", merged.note ?? null);

    await txn.runAsync(`UPDATE transactions SET ${set.join(", ")} WHERE id = ?`, ...params, id);

    await applyEffect(
      txn,
      {
        account_id: merged.account_id,
        transfer_account_id: merged.type === "transfer" ? (merged.transfer_account_id ?? null) : null,
        type: merged.type,
        amount: merged.amount,
      },
      1,
    );
  });

  return getTransactionById(id);
}

export async function deleteTransaction(id: number): Promise<void> {
  const existing = await getTransactionById(id);
  if (!existing) return;

  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await applyEffect(
      txn,
      {
        account_id: existing.account_id,
        transfer_account_id: existing.transfer_account_id,
        type: existing.type,
        amount: existing.amount,
      },
      -1,
    );
    await txn.runAsync("DELETE FROM transactions WHERE id = ?", id);
  });

  await deleteReceiptsByTransaction(id);
}
