import { addHijriYear, estimate } from "../hijri";

describe("addHijriYear", () => {
  const samples = [
    new Date(Date.UTC(2026, 7, 1)),
    new Date(Date.UTC(2025, 0, 15)),
    new Date(Date.UTC(2030, 11, 31)),
    new Date(Date.UTC(2020, 2, 10)),
  ];

  test.each(samples)("adds exactly one Hijri year for %s", (sample) => {
    const before = estimate(sample);
    const next = addHijriYear(sample);
    const after = estimate(next);

    expect(after.year).toBe(before.year + 1);
    expect(after.month).toBe(before.month);
    expect(after.day).toBe(before.day);
  });
});

// Checks the arithmetic estimate against a real, well-documented anchor:
// 1 Muharram 1447H fell on 27 June 2025 per Malaysia's JAKIM sighting
// announcement.
test("estimate matches known anchor", () => {
  const result = estimate(new Date(Date.UTC(2025, 5, 27)));
  expect(result).toEqual({ year: 1447, month: 1, day: 1 });
});
