import {
  addMonthsClamped,
  addYearsClamped,
  computeNextDueDate,
  daysUntilDue,
} from "../reminder-recurrence";

describe("addMonthsClamped", () => {
  test("month-end clamps to the shorter month", () => {
    expect(addMonthsClamped(new Date(Date.UTC(2026, 0, 31)), 1)).toEqual(
      new Date(Date.UTC(2026, 1, 28)),
    );
  });

  test("leap year Feb 29 clamps to Feb 28 a year later", () => {
    expect(addMonthsClamped(new Date(Date.UTC(2024, 1, 29)), 12)).toEqual(
      new Date(Date.UTC(2025, 1, 28)),
    );
  });

  test("regular day rolls over to the same day next month", () => {
    expect(addMonthsClamped(new Date(Date.UTC(2026, 2, 15)), 1)).toEqual(
      new Date(Date.UTC(2026, 3, 15)),
    );
  });

  test("crosses a year boundary", () => {
    expect(addMonthsClamped(new Date(Date.UTC(2026, 11, 20)), 1)).toEqual(
      new Date(Date.UTC(2027, 0, 20)),
    );
  });
});

describe("addYearsClamped", () => {
  test("29 Feb in a leap year lands on 28 Feb the next (non-leap) year", () => {
    expect(addYearsClamped(new Date(Date.UTC(2024, 1, 29)), 1)).toEqual(
      new Date(Date.UTC(2025, 1, 28)),
    );
  });
});

describe("computeNextDueDate", () => {
  const due = new Date(Date.UTC(2026, 0, 31));

  test("one_time has no next cycle", () => {
    expect(computeNextDueDate(due, "one_time", null)).toBeNull();
  });

  test("monthly advances one month, clamped", () => {
    expect(computeNextDueDate(due, "monthly", null)).toEqual(
      new Date(Date.UTC(2026, 1, 28)),
    );
  });

  test("yearly advances one year", () => {
    expect(computeNextDueDate(due, "yearly", null)).toEqual(
      new Date(Date.UTC(2027, 0, 31)),
    );
  });

  test("custom advances by the configured interval", () => {
    expect(computeNextDueDate(due, "custom", 14)).toEqual(
      new Date(Date.UTC(2026, 1, 14)),
    );
  });

  test("custom falls back to 30 days when interval is missing", () => {
    expect(computeNextDueDate(due, "custom", null)).toEqual(
      new Date(Date.UTC(2026, 2, 2)),
    );
  });
});

describe("daysUntilDue", () => {
  const now = new Date(Date.UTC(2026, 7, 27, 15, 0, 0));

  test("due today is 0 regardless of time of day", () => {
    expect(daysUntilDue(new Date(Date.UTC(2026, 7, 27, 2, 0, 0)), now)).toBe(0);
  });

  test("due tomorrow is 1", () => {
    expect(daysUntilDue(new Date(Date.UTC(2026, 7, 28)), now)).toBe(1);
  });

  test("overdue by 3 days is -3", () => {
    expect(daysUntilDue(new Date(Date.UTC(2026, 7, 24)), now)).toBe(-3);
  });
});
