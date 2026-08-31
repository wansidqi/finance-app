// The actual scraping/parsing logic (per-state HTML anchors, Selangor's
// JSON feed, Terengganu's year/amount table, etc.) now lives entirely in
// apps/backend/internal/nisabscrape — this app just reads the one merged
// JSON response from apps/backend `GET /api/zakat/nisab-states`. Coverage
// for the scraping itself is in that Go package's own tests
// (internal/nisabscrape/scrape_test.go); these tests only cover this thin
// client's own behavior.

import { getAllStateNisabRates, getStateNisab, invalidateStateNisabCache } from "../nisab-state-sync-service";

const originalFetch = global.fetch;
const originalUrl = process.env.EXPO_PUBLIC_API_URL;

beforeEach(() => {
  invalidateStateNisabCache();
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  invalidateStateNisabCache();
});

describe("getAllStateNisabRates", () => {
  test("returns an empty list when EXPO_PUBLIC_API_URL isn't configured", async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    global.fetch = jest.fn();

    const rates = await getAllStateNisabRates();
    expect(rates).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("maps a successful backend response, preserving isScraped/zakatAgency/goldUrufWornGrams", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        states: [
          {
            state: "selangor",
            zakatAgency: "Lembaga Zakat Selangor (LZS)",
            nisabRM: 38748,
            sourceUrl: "https://www.zakatselangor.com.my/",
            isScraped: true,
            asOf: "2026-08-31",
          },
          {
            state: "kelantan",
            zakatAgency: "MAIK",
            nisabRM: 37401,
            goldUrufWornGrams: 90,
            isScraped: false,
            asOf: "2026-08",
          },
        ],
      }),
    }) as any;

    const rates = await getAllStateNisabRates();
    expect(rates).toEqual([
      {
        state: "selangor",
        nisabRM: 38748,
        zakatAgency: "Lembaga Zakat Selangor (LZS)",
        goldUrufWornGrams: null,
        sourceUrl: "https://www.zakatselangor.com.my/",
        isScraped: true,
        asOf: "2026-08-31",
      },
      {
        state: "kelantan",
        nisabRM: 37401,
        zakatAgency: "MAIK",
        goldUrufWornGrams: 90,
        sourceUrl: null,
        isScraped: false,
        asOf: "2026-08",
      },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/zakat/nisab-states",
      expect.anything(),
    );
  });

  test("filters out entries with no state key or a non-finite nisabRM", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        states: [
          { state: "", nisabRM: 38748, isScraped: true, asOf: "2026-08-31", zakatAgency: "X" },
          { state: "johor", nisabRM: NaN, isScraped: true, asOf: "2026-08-31", zakatAgency: "X" },
          { state: "kedah", nisabRM: 32871.27, isScraped: true, asOf: "2026-08-31", zakatAgency: "LZNK" },
        ],
      }),
    }) as any;

    const rates = await getAllStateNisabRates();
    expect(rates.map((r) => r.state)).toEqual(["kedah"]);
  });

  test("returns an empty list when the backend responds with a non-2xx status", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;

    expect(await getAllStateNisabRates()).toEqual([]);
  });

  test("returns an empty list rather than throwing when fetch itself rejects", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com";
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as any;

    expect(await getAllStateNisabRates()).toEqual([]);
  });

  test("caches the result — a second call within the TTL doesn't refetch", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        states: [{ state: "selangor", zakatAgency: "LZS", nisabRM: 38748, isScraped: true, asOf: "2026-08-31" }],
      }),
    }) as any;

    await getAllStateNisabRates();
    await getAllStateNisabRates();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("invalidateStateNisabCache forces the next call to refetch", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        states: [{ state: "selangor", zakatAgency: "LZS", nisabRM: 38748, isScraped: true, asOf: "2026-08-31" }],
      }),
    }) as any;

    await getAllStateNisabRates();
    invalidateStateNisabCache();
    await getAllStateNisabRates();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("getStateNisab", () => {
  test("finds the matching state from the full list", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        states: [
          { state: "selangor", zakatAgency: "LZS", nisabRM: 38748, isScraped: true, asOf: "2026-08-31" },
          { state: "johor", zakatAgency: "MAIJ", nisabRM: 45825.48, isScraped: true, asOf: "2026-08-31" },
        ],
      }),
    }) as any;

    const rate = await getStateNisab("johor");
    expect(rate?.nisabRM).toBe(45825.48);
  });

  test("returns null when the state isn't in the list", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com";
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ states: [] }) }) as any;

    expect(await getStateNisab("perlis")).toBeNull();
  });
});
