jest.mock("expo-sqlite", () => {
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(":memory:");

  return {
    openDatabaseAsync: async () => ({
      execAsync: async (sql: string) => {
        db.exec(sql);
      },
      getAllAsync: async (sql: string, ...params: any[]) => {
        return db.prepare(sql).all(...params);
      },
      getFirstAsync: async (sql: string, ...params: any[]) => {
        return db.prepare(sql).get(...params) ?? null;
      },
      runAsync: async (sql: string, ...params: any[]) => {
        const info = db.prepare(sql).run(...params);
        return { lastInsertRowId: Number(info.lastInsertRowid), changes: Number(info.changes) };
      },
    }),
  };
});

import { resolveNisab } from "../nisab-resolver";
import { invalidateStateNisabCache } from "../nisab-state-sync-service";

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

function mockBackendStates(states: object[]) {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.com";
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ states }),
  }) as any;
}

async function seedLocation(state: string): Promise<void> {
  const db = await require("../db").getDb();
  await db.runAsync(
    `INSERT INTO user_location (id, state_key, method, raw_region, detected_at) VALUES (1, ?, 'gps', ?, ?)
     ON CONFLICT(id) DO UPDATE SET state_key = excluded.state_key, raw_region = excluded.raw_region, detected_at = excluded.detected_at`,
    state,
    state,
    new Date().toISOString(),
  );
}

test("resolves as unavailable, with a null nisabRM, when no location has ever been detected", async () => {
  const result = await resolveNisab();
  expect(result.source).toEqual({ kind: "unavailable" });
  expect(result.nisabRM).toBeNull();
});

test("resolves as unavailable when the backend isn't configured", async () => {
  await seedLocation("johor");
  delete process.env.EXPO_PUBLIC_API_URL;

  const result = await resolveNisab();
  expect(result.source).toEqual({ kind: "unavailable" });
  expect(result.nisabRM).toBeNull();
});

test("uses the state's scraped rate (isScraped: true) when the backend has one for the detected state", async () => {
  await seedLocation("johor");
  mockBackendStates([
    { state: "johor", zakatAgency: "MAIJ", nisabRM: 45825.48, sourceUrl: "https://www.maij.gov.my/", isScraped: true, asOf: "2026-08-31" },
  ]);

  const result = await resolveNisab();
  expect(result.nisabRM).toBe(45825.48);
  expect(result.source).toMatchObject({ kind: "state", state: "johor", sourceUrl: "https://www.maij.gov.my/" });
});

test("uses the AI-fallback rate (isScraped: false) for the detected state when that's all the backend has for it", async () => {
  await seedLocation("kelantan");
  mockBackendStates([
    { state: "kelantan", zakatAgency: "MAIK", nisabRM: 37401, isScraped: false, asOf: "2026-08" },
  ]);

  const result = await resolveNisab();
  expect(result.nisabRM).toBe(37401);
  expect(result.source).toMatchObject({ kind: "ai_fallback", state: "kelantan" });
});

test("falls back to PPZ's rate when the detected state has none, but PPZ does", async () => {
  await seedLocation("perlis");
  mockBackendStates([
    { state: "wp_kl_putrajaya_labuan", zakatAgency: "PPZ-MAIWP", nisabRM: 33996, sourceUrl: "https://www.zakat.com.my/", isScraped: true, asOf: "2026-08-31" },
  ]);

  const result = await resolveNisab();
  expect(result.nisabRM).toBe(33996);
  expect(result.source).toMatchObject({ kind: "ppz_fallback" });
});

test("resolves as unavailable when the backend has neither the detected state nor PPZ", async () => {
  await seedLocation("perlis");
  mockBackendStates([]);

  const result = await resolveNisab();
  expect(result.source).toEqual({ kind: "unavailable" });
  expect(result.nisabRM).toBeNull();
});
