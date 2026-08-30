// Metadata only — never carries the BLOB bytes, so listing documents stays
// cheap. Fetch bytes separately (getVaultDocumentData) only when a document
// is actually opened for viewing.
export interface VaultDocumentInterface {
  id: number;
  name: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  expiry_date: string | null;
  note: string | null;
  // Freeform grouping tag, e.g. "IC" (front/back scans) or "Project A"
  // (many unrelated documents) — same shape as Assets' `platform` field,
  // grouped client-side rather than a separate folders table.
  folder: string | null;
  created_at: string;
  updated_at?: string;
}
