import { ReminderRecurrence } from "@/interface/reminder";

/**
 * Adds `months` calendar months to `date`, clamping to the last valid day of
 * the resulting month when the original day doesn't exist there (e.g. 31 Jan
 * + 1 month lands on 28/29 Feb, not 3 Mar) — matches how bills like rent or
 * insurance actually recur rather than letting the date silently drift.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getUTCDate();
  // Day 1 of the target month first, so setting the month never overflows
  // into a different month than intended (e.g. 31 Jan -> 31 Feb doesn't exist
  // and would roll over to March if we set the day before the month).
  const firstOfTargetMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  firstOfTargetMonth.setUTCDate(Math.min(day, lastDayOfTargetMonth));
  firstOfTargetMonth.setUTCHours(
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
  return firstOfTargetMonth;
}

/** Adds `years` calendar years, clamping 29 Feb to 28 Feb in a non-leap target year. */
export function addYearsClamped(date: Date, years: number): Date {
  return addMonthsClamped(date, years * 12);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/**
 * Computes the next due date after a reminder is marked paid. Returns `null`
 * for a "one_time" reminder — there is no next cycle, the caller should mark
 * it COMPLETED instead.
 */
export function computeNextDueDate(
  currentDueDate: Date,
  recurrence: ReminderRecurrence,
  recurrenceIntervalDays: number | null,
): Date | null {
  switch (recurrence) {
    case "one_time":
      return null;
    case "monthly":
      return addMonthsClamped(currentDueDate, 1);
    case "yearly":
      return addYearsClamped(currentDueDate, 1);
    case "custom":
      return addDays(currentDueDate, recurrenceIntervalDays ?? 30);
  }
}

/**
 * Whole calendar days between `now` and `dueDate`, comparing UTC calendar
 * dates rather than raw millisecond deltas — otherwise a due date later
 * today but earlier in the clock hour would round to "overdue".
 */
export function daysUntilDue(dueDate: Date, now: Date): number {
  const dueMidnight = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
  );
  const nowMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((dueMidnight - nowMidnight) / (24 * 60 * 60 * 1000));
}
