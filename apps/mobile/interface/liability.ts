export interface LiabilityInterface {
  id: number;
  user_id?: number;
  name: string;
  category: "debt" | "commitment";
  total_balance: number | null;
  monthly_payment: number;
  status?: "ACTIVE" | "INACTIVE";
  remaining_month?: number | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}
