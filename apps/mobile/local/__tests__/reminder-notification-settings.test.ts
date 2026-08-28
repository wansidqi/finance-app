import {
  clampHour,
  clampMinute,
  DEFAULT_REMINDER_OFFSETS_DAYS,
  sanitizeOffsets,
} from "../reminder-notification-settings-service";

describe("sanitizeOffsets", () => {
  test("de-dupes and sorts descending", () => {
    expect(sanitizeOffsets([1, 7, 3, 7, 0])).toEqual([7, 3, 1, 0]);
  });

  test("clamps negative/fractional values to non-negative integers", () => {
    expect(sanitizeOffsets([-5, 2.9, 0])).toEqual([2, 0]);
  });

  test("falls back to the default set when empty", () => {
    expect(sanitizeOffsets([])).toEqual(DEFAULT_REMINDER_OFFSETS_DAYS);
  });

  test("negative values clamp to 0 rather than dropping out", () => {
    expect(sanitizeOffsets([-1, -2])).toEqual([0]);
  });
});

describe("clampHour", () => {
  test("clamps into 0-23", () => {
    expect(clampHour(-1)).toBe(0);
    expect(clampHour(23)).toBe(23);
    expect(clampHour(30)).toBe(23);
    expect(clampHour(9.7)).toBe(9);
  });
});

describe("clampMinute", () => {
  test("clamps into 0-59", () => {
    expect(clampMinute(-1)).toBe(0);
    expect(clampMinute(59)).toBe(59);
    expect(clampMinute(75)).toBe(59);
    expect(clampMinute(30.5)).toBe(30);
  });
});
