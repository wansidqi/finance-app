import { ReminderCategory, ReminderRecurrence } from "@/interface/reminder";

export const REMINDER_CATEGORIES: ReminderCategory[] = [
  "rent",
  "insurance",
  "subscription",
  "utility",
  "loan",
  "credit_card",
  "school_fee",
  "other",
];

export const REMINDER_CATEGORY_LABELS: Record<ReminderCategory, string> = {
  rent: "Rent",
  insurance: "Insurance",
  subscription: "Subscription",
  utility: "Utility",
  loan: "Loan",
  credit_card: "Credit Card",
  school_fee: "School Fee",
  other: "Other",
};

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
