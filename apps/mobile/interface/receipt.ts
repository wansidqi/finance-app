// Metadata only — never carries the BLOB bytes, so listing a transaction's
// receipts stays cheap. Fetch bytes separately (getReceiptData) only when a
// receipt is actually opened for viewing.
export interface ReceiptAttachmentInterface {
  id: number;
  transaction_id: number;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}
