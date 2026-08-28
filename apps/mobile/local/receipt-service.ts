import { ReceiptAttachmentInterface } from "@/interface/receipt";
import { getDb } from "./db";

interface ReceiptMetaRow {
  id: number;
  transaction_id: number;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

const META_COLUMNS = "id, transaction_id, file_name, mime_type, size_bytes, created_at";

export async function getReceiptsByTransaction(
  transactionId: number,
): Promise<ReceiptAttachmentInterface[]> {
  const db = await getDb();
  return db.getAllAsync<ReceiptMetaRow>(
    `SELECT ${META_COLUMNS} FROM receipt_attachments WHERE transaction_id = ? ORDER BY created_at DESC, id DESC`,
    transactionId,
  );
}

/** Loads a single receipt's bytes — kept separate from list/metadata reads so those never pull BLOB data. */
export async function getReceiptData(
  id: number,
): Promise<{ mime_type: string; file_name: string; data: Uint8Array } | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ mime_type: string; file_name: string; data: Uint8Array }>(
    "SELECT mime_type, file_name, data FROM receipt_attachments WHERE id = ?",
    id,
  );
  return row ?? null;
}

export async function addReceipt(data: {
  transaction_id: number;
  file_name: string;
  mime_type: string;
  bytes: Uint8Array;
}): Promise<ReceiptAttachmentInterface> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO receipt_attachments (transaction_id, file_name, mime_type, size_bytes, data)
     VALUES (?, ?, ?, ?, ?)`,
    data.transaction_id,
    data.file_name,
    data.mime_type,
    data.bytes.byteLength,
    data.bytes,
  );

  const row = await db.getFirstAsync<ReceiptMetaRow>(
    `SELECT ${META_COLUMNS} FROM receipt_attachments WHERE id = ?`,
    result.lastInsertRowId,
  );
  if (!row) throw new Error("failed to load created receipt");
  return row;
}

export async function deleteReceipt(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM receipt_attachments WHERE id = ?", id);
}

/** Deletes every receipt attached to a transaction — call before deleting the transaction itself, since there's no DB-level cascade (foreign_keys pragma is off). */
export async function deleteReceiptsByTransaction(transactionId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM receipt_attachments WHERE transaction_id = ?", transactionId);
}
