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
import { syncOneState } from "../nisab-state-sync-service";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

test("falls back to gold-price nisab when no location has ever been detected", async () => {
  const result = await resolveNisab();
  expect(result.source).toEqual({ kind: "gold_price" });
  expect(result.nisabRM).toBeGreaterThan(0);
});

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

test("falls back to gold-price nisab when the detected state has no synced rate", async () => {
  await seedLocation("sarawak");

  const result = await resolveNisab();
  expect(result.source).toEqual({ kind: "gold_price" });
});

test("uses the state's synced rate when the detected state has one cached", async () => {
  await seedLocation("johor");

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => "<p>Kadar Nisab Zakat Semasa Terkini: RM45,825.48</p>",
  }) as any;
  await syncOneState({
    state: "johor",
    authorityName: "MAIJ",
    url: "https://www.maij.gov.my/?page_id=110",
    anchorText: "kadar nisab zakat semasa terkini",
  });

  const result = await resolveNisab();
  expect(result.nisabRM).toBe(45825.48);
  expect(result.source).toMatchObject({ kind: "state", state: "johor" });
});

test("falls back to PPZ's rate when the detected state has none of its own, but PPZ does", async () => {
  await seedLocation("kelantan"); // no live source configured for Kelantan

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => "<p>Nisab 2026: RM33,996.00</p>",
  }) as any;
  await syncOneState({
    state: "wp_kl_putrajaya_labuan",
    authorityName: "PPZ-MAIWP",
    url: "https://www.zakat.com.my/info-zakat/jenis-jenis-zakat/zakat-pendapatan/",
    anchorText: "nisab 2026",
  });

  const result = await resolveNisab();
  expect(result.nisabRM).toBe(33996);
  expect(result.source).toMatchObject({ kind: "ppz_fallback" });
});
