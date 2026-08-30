export interface LiabilityInterface {
  id: number;
  user_id?: number;
  name: string;
  category: "debt" | "commitment";
  total_balance: number | null;
  monthly_payment: number;
  status?: "ACTIVE" | "INACTIVE";
  remaining_month?: number | null;
  // Optional payment reminder, backed by a linked `payment_reminders` row.
  // `reminder_due_date` is `undefined` when writing to mean "leave as-is",
  // an ISO string to enable/reschedule, or `null` to disable the reminder.
  reminder_id?: number | null;
  reminder_due_date?: string | null;
  reminder_status?: "ACTIVE" | "PAUSED" | "COMPLETED" | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}
