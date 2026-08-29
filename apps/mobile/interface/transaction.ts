export type TransactionType =
  | "income"
  | "expense"
  | "investment_purchase"
  | "investment_sale"
  | "dividend"
  | "interest"
  | "debt_payment"
  | "zakat_payment";

export interface TransactionInterface {
  id: number;
  type: TransactionType;
  amount: number;
  occurred_at: string;
  description: string | null;
  note: string | null;
  // LHDN tax relief tagging (Phase 4) — only meaningful when set together;
  // most transactions leave both null.
  tax_relief_category: string | null;
  assessment_year: number | null;
  created_at?: string;
  updated_at?: string;
}
