import { VaultDocumentInterface } from "@/interface/document-vault";
import { getDb } from "./db";

const META_COLUMNS =
  "id, name, file_name, mime_type, size_bytes, expiry_date, note, folder, created_at, updated_at";

export async function getAllDocuments(): Promise<VaultDocumentInterface[]> {
  const db = await getDb();
  return db.getAllAsync<VaultDocumentInterface>(
    `SELECT ${META_COLUMNS} FROM vault_documents ORDER BY created_at DESC, id DESC`,
  );
}

/** Loads a single document's bytes — kept separate from list/metadata reads so those never pull BLOB data. */
export async function getVaultDocumentData(
  id: number,
): Promise<{ mime_type: string; file_name: string; data: Uint8Array } | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ mime_type: string; file_name: string; data: Uint8Array }>(
    "SELECT mime_type, file_name, data FROM vault_documents WHERE id = ?",
    id,
  );
  return row ?? null;
}

export async function addVaultDocument(data: {
  name: string;
  file_name: string;
  mime_type: string;
  bytes: Uint8Array;
  expiry_date?: string | null;
  note?: string | null;
  folder?: string | null;
}): Promise<VaultDocumentInterface> {
  const db = await getDb();
  // `category` predates a UI simplification (search replaced category
  // browsing/filtering) but the column is still NOT NULL — kept as a
  // constant rather than migrating the column away.
  const result = await db.runAsync(
    `INSERT INTO vault_documents (category, name, file_name, mime_type, size_bytes, data, expiry_date, note, folder)
     VALUES ('document', ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.name,
    data.file_name,
    data.mime_type,
    data.bytes.byteLength,
    data.bytes,
    data.expiry_date ?? null,
    data.note ?? null,
    data.folder ?? null,
  );

  const row = await db.getFirstAsync<VaultDocumentInterface>(
    `SELECT ${META_COLUMNS} FROM vault_documents WHERE id = ?`,
    result.lastInsertRowId,
  );
  if (!row) throw new Error("failed to load created document");
  return row;
}

export async function updateVaultDocument(
  id: number,
  data: {
    name: string;
    expiry_date?: string | null;
    note?: string | null;
    folder?: string | null;
    file?: { file_name: string; mime_type: string; bytes: Uint8Array } | null;
  },
): Promise<VaultDocumentInterface> {
  const db = await getDb();

  if (data.file) {
    await db.runAsync(
      `UPDATE vault_documents
       SET name = ?, expiry_date = ?, note = ?, folder = ?, file_name = ?, mime_type = ?, size_bytes = ?, data = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      data.name,
      data.expiry_date ?? null,
      data.note ?? null,
      data.folder ?? null,
      data.file.file_name,
      data.file.mime_type,
      data.file.bytes.byteLength,
      data.file.bytes,
      id,
    );
  } else {
    await db.runAsync(
      `UPDATE vault_documents
       SET name = ?, expiry_date = ?, note = ?, folder = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      data.name,
      data.expiry_date ?? null,
      data.note ?? null,
      data.folder ?? null,
      id,
    );
  }

  const row = await db.getFirstAsync<VaultDocumentInterface>(
    `SELECT ${META_COLUMNS} FROM vault_documents WHERE id = ?`,
    id,
  );
  if (!row) throw new Error("failed to load updated document");
  return row;
}

export async function deleteVaultDocument(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM vault_documents WHERE id = ?", id);
}
