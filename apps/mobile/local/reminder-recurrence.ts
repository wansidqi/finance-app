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

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/**
 * Computes a recurring reminder's next due date, one cycle ahead of
 * `currentDueDate`. Returns `null` for a "one_time" reminder — there is no
 * next cycle, callers should leave it as-is (it just stays overdue until
 * deleted).
 */
export function computeNextDueDate(
  currentDueDate: Date,
  recurrence: ReminderRecurrence,
  recurrenceIntervalDays: number | null,
): Date | null {
  switch (recurrence) {
    case "one_time":
      return null;
    case "daily":
      return addDays(currentDueDate, 1);
    case "weekly":
      return addDays(currentDueDate, 7);
    case "monthly":
      return addMonthsClamped(currentDueDate, 1);
    case "quarterly":
      return addMonthsClamped(currentDueDate, 3);
    case "yearly":
      return addYearsClamped(currentDueDate, 1);
    case "custom":
      // Guards against a non-positive interval (e.g. bad data from before
      // validation existed) looping forever wherever this feeds an
      // advance-until-caught-up loop.
      return addDays(currentDueDate, recurrenceIntervalDays && recurrenceIntervalDays > 0 ? recurrenceIntervalDays : 30);
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
