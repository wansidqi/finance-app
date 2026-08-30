export type ReminderRecurrence =
  | "one_time"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

export type ReminderStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

/** Whether a reminder's notifications follow the app-wide schedule or override it with their own. */
export type ReminderTimingMode = "global" | "custom";

export interface ReminderInterface {
  id: number;
  user_id?: number;
  name: string;
  recurrence: ReminderRecurrence;
  // Only meaningful when recurrence === "custom".
  recurrence_interval_days: number | null;
  next_due_date: string;
  last_paid_date: string | null;
  // Freeform detail — what the reminder is about (e.g. "Service car at Proton center").
  note: string | null;
  status: ReminderStatus;
  notification_mode: ReminderTimingMode;
  // Only meaningful when notification_mode === "custom".
  notification_offsets_days: number[] | null;
  notification_hour: number | null;
  notification_minute: number | null;
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
