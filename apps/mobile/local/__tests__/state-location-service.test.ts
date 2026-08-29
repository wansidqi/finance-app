import { matchState } from "../state-location-service";

test("matches plain state names", () => {
  expect(matchState("Selangor")).toBe("selangor");
  expect(matchState("Johor")).toBe("johor");
  expect(matchState("Sarawak")).toBe("sarawak");
});

test("matches Wilayah Persekutuan variants to the shared WP jurisdiction", () => {
  expect(matchState("Wilayah Persekutuan Kuala Lumpur")).toBe("wp_kl_putrajaya_labuan");
  expect(matchState("W.P. Putrajaya")).toBe("wp_kl_putrajaya_labuan");
  expect(matchState("Labuan")).toBe("wp_kl_putrajaya_labuan");
  expect(matchState("Federal Territory of Kuala Lumpur")).toBe("wp_kl_putrajaya_labuan");
});

test("matches Penang/Pulau Pinang and Malacca/Melaka aliases", () => {
  expect(matchState("Penang")).toBe("pulau_pinang");
  expect(matchState("Pulau Pinang")).toBe("pulau_pinang");
  expect(matchState("Malacca")).toBe("melaka");
});

test("is case-insensitive and ignores punctuation", () => {
  expect(matchState("  SELANGOR ")).toBe("selangor");
  expect(matchState("negeri sembilan")).toBe("negeri_sembilan");
});

test("returns null for empty or unrecognized input", () => {
  expect(matchState(null)).toBeNull();
  expect(matchState(undefined)).toBeNull();
  expect(matchState("")).toBeNull();
  expect(matchState("Singapore")).toBeNull();
});
