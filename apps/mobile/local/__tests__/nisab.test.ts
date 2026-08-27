import { computeNisab } from "../nisab";

test("computeNisab matches a real BNM quote observed 2026-08-26", () => {
  // one_oz buying=19150, selling=19950.
  const result = computeNisab(19150, 19950);

  expect(result.pricePerGram).toBeCloseTo(628.55, 1);
  expect(result.nisabRM).toBeCloseTo(53426.5, 0);
});

test("computeNisab scales with gold price", () => {
  const low = computeNisab(10000, 10500);
  const high = computeNisab(20000, 21000);

  expect(high.nisabRM).toBeGreaterThan(low.nisabRM);

  // Doubling the gold price should roughly double the nisab.
  const ratio = high.nisabRM / low.nisabRM;
  expect(ratio).toBeGreaterThanOrEqual(1.9);
  expect(ratio).toBeLessThanOrEqual(2.1);
});
