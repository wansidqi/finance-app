export interface LiabilityInterface {
  id: number;
  user_id?: number;
  name: string;
  category: "debt" | "commitment";
  total_balance: number | null;
  monthly_payment: number;
  status?: "ACTIVE" | "INACTIVE";
  remaining_month?: number | null;
  // Average of this liability's recently logged payments (see
  // LiabilityPaymentInterface) when any exist — falls back to
  // monthly_payment otherwise. Lets commitments whose payment amount
  // varies month to month (e.g. a PayLater/Shopee plan) still surface a
  // realistic "per month" figure instead of a fixed guess.
  average_monthly_payment?: number;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface LiabilityPaymentInterface {
  id: number;
  liability_id: number;
  amount: number;
  paid_date: string;
  note: string | null;
  created_at: string;
}
