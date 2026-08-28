export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "investment_purchase"
  | "investment_sale"
  | "dividend"
  | "interest"
  | "debt_payment"
  | "zakat_payment";

export interface TransactionInterface {
  id: number;
  account_id: number;
  // Destination account — only set (and only meaningful) when type === "transfer".
  transfer_account_id: number | null;
  type: TransactionType;
  // Always stored positive; the sign applied to each account's balance is
  // derived from `type` (see local/transaction-effect.ts).
  amount: number;
  occurred_at: string;
  description: string | null;
  note: string | null;
  // Derived, joined in for display — not stored on this row.
  account_name?: string;
  transfer_account_name?: string | null;
  created_at?: string;
  updated_at?: string;
}
