import { ReminderRecurrence } from "@/interface/reminder";

export const REMINDER_RECURRENCES: ReminderRecurrence[] = [
  "one_time",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
];

export const REMINDER_RECURRENCE_LABELS: Record<ReminderRecurrence, string> = {
  one_time: "One-time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Annually",
  custom: "Custom",
};
