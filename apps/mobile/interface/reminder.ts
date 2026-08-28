export type ReminderRecurrence = "one_time" | "monthly" | "yearly" | "custom";

export type ReminderCategory =
  | "rent"
  | "insurance"
  | "subscription"
  | "utility"
  | "loan"
  | "credit_card"
  | "school_fee"
  | "other";

export type ReminderStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

export interface ReminderInterface {
  id: number;
  user_id?: number;
  name: string;
  category: ReminderCategory;
  amount: number;
  recurrence: ReminderRecurrence;
  // Only meaningful when recurrence === "custom".
  recurrence_interval_days: number | null;
  next_due_date: string;
  last_paid_date: string | null;
  note: string | null;
  status: ReminderStatus;
  // Derived, not stored — computed relative to "now" when the row is read.
  days_until_due: number;
  is_overdue: boolean;
  is_due_today: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ReminderNotificationMode = "default" | "custom";

/**
 * Always resolved to concrete, effective values — when mode is "default"
 * these are the hardcoded defaults; when "custom" they're the user's saved
 * values. Consumers (notification sync) never need to branch on mode.
 */
export interface ReminderNotificationSettingsInterface {
  mode: ReminderNotificationMode;
  offsets_days: number[];
  hour: number;
  minute: number;
}
