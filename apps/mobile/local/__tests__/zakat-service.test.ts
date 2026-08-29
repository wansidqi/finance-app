import { addHijriYear } from "../hijri";
import { computeHaulStatus } from "../zakat-service";

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

describe("computeHaulStatus", () => {
  const now = new Date(Date.UTC(2026, 7, 27));

  test("never tracked, nisab not reached", () => {
    const { status, nextDue, newHaulStart } = computeHaulStatus(null, null, false, now);
    expect(status).toBe("PENDING");
    expect(nextDue).toBeNull();
    expect(newHaulStart).toBeNull();
  });

  test("nisab just reached, never paid before, starts a new haul today", () => {
    const { status, nextDue, newHaulStart } = computeHaulStatus(null, null, true, now);
    expect(status).toBe("PENDING");
    expect(newHaulStart).toEqual(now);
    expect(nextDue).toEqual(addHijriYear(now));
  });

  test("haul never started but a past payment exists: anchors to last_paid_date, not today", () => {
    const lastPaid = addDays(now, -100);
    const { nextDue, newHaulStart } = computeHaulStatus(null, lastPaid, true, now);
    expect(newHaulStart).toEqual(lastPaid);
    expect(nextDue).toEqual(addHijriYear(lastPaid));
  });

  test("well before due date is pending", () => {
    const start = addDays(now, -100);
    const { status, newHaulStart } = computeHaulStatus(start, null, true, now);
    expect(status).toBe("PENDING");
    expect(newHaulStart).toEqual(start);
  });

  test("within reminder window is due", () => {
    const start = addDays(now, -351);
    const { status } = computeHaulStatus(start, null, true, now);
    expect(status).toBe("DUE");
  });

  test("past due date with nisab held is overdue and haul start is unchanged", () => {
    const start = addDays(now, -400);
    const { status, nextDue, newHaulStart } = computeHaulStatus(start, null, true, now);
    expect(status).toBe("OVERDUE");
    expect(newHaulStart).toEqual(start);
    expect(nextDue).not.toBeNull();
  });

  test("cycle completes without nisab held resets the haul", () => {
    const start = addDays(now, -400);
    const { status, nextDue, newHaulStart } = computeHaulStatus(start, null, false, now);
    expect(status).toBe("PENDING");
    expect(nextDue).toBeNull();
    expect(newHaulStart).toBeNull();
  });

  test("mid-cycle dip below nisab resets the haul immediately", () => {
    const start = addDays(now, -100);
    const { status, nextDue, newHaulStart } = computeHaulStatus(start, null, false, now);
    expect(status).toBe("PENDING");
    expect(nextDue).toBeNull();
    expect(newHaulStart).toBeNull();
  });
});
