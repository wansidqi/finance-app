import { ReminderRecurrence } from "@/interface/reminder";

export const REMINDER_RECURRENCES: ReminderRecurrence[] = [
  "one_time",
  "monthly",
  "yearly",
  "custom",
];

export const REMINDER_RECURRENCE_LABELS: Record<ReminderRecurrence, string> = {
  one_time: "One-time",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
};
