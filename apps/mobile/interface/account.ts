export type AccountType =
  | "bank"
  | "cash"
  | "savings"
  | "ewallet"
  | "asb"
  | "brokerage"
  | "crypto";

export type AccountStatus = "ACTIVE" | "ARCHIVED";

export interface AccountInterface {
  id: number;
  user_id?: number;
  name: string;
  type: AccountType;
  institution: string | null;
  // Running balance, kept in sync by transaction-service as transactions
  // against this account are created/updated/deleted.
  balance: number;
  note: string | null;
  status: AccountStatus;
  created_at?: string;
  updated_at?: string;
}
