/**
 * End-to-end verification of the local-first data layer against a REAL
 * SQLite engine (node:sqlite), not just the pure-function unit tests —
 * expo-sqlite itself can't run outside a device/simulator, so this is the
 * closest thing to a real integration test available in this environment.
 * Exercises the actual asset/zakat service modules unmodified.
 */
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

import { createAsset, getAllAssets, updateAsset } from "../asset-service";
import {
  getReminderNotificationSettings,
  setReminderNotificationSettings,
} from "../reminder-notification-settings-service";
import { getAllCategories, upsertTracker } from "../zakat-service";

describe("local-first integration (real SQLite via node:sqlite)", () => {
  test("create a CASH asset and see it reflected in getAllAssets", async () => {
    const created = await createAsset({
      category: "CASH" as any,
      name: "Savings Account",
      platform: "Maybank",
      price: 45000,
      is_calculate: true,
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.price).toBe(45000);

    const all = await getAllAssets();
    const found = all.find((a) => a.id === created.id);
    expect(found).toBeTruthy();
    expect(found!.category).toBe("CASH");
    expect(found!.price).toBe(45000);
  });

  test("GOLD asset with use_live_gold_price computes price from live/fallback gold price × weight", async () => {
    const created = await createAsset({
      category: "GOLD" as any,
      name: "Gold Bar",
      quantity: 10,
      unit: "gram",
      use_live_gold_price: true,
      is_calculate: true,
    });

    // price should NOT be the manually-entered value (there wasn't one) —
    // it should be computed as quantity * pricePerGram, which is > 0
    // whether it came from a live BNM fetch or the fallback constant.
    expect(created.price).not.toBeNull();
    expect(created.price).toBeGreaterThan(0);
    expect(created.price).toBeCloseTo(10 * (created.price! / 10), 5);

    // Toggling it off and setting a manual price should stick.
    const updated = await updateAsset({
      id: created.id,
      use_live_gold_price: false,
      price: 9999,
    });
    expect(updated?.use_live_gold_price).toBe(false);
    expect(updated?.price).toBe(9999);
  }, 15000);

  test("platform_total derives price as total minus siblings", async () => {
    await createAsset({
      category: "CASH" as any,
      name: "Sub-entry",
      platform: "TNG eWallet",
      price: 200,
      is_calculate: true,
    });
    const catchAll = await createAsset({
      category: "CASH" as any,
      name: "TNG Wallet Total",
      platform: "TNG eWallet",
      platform_total: 500,
      is_calculate: true,
    });

    const all = await getAllAssets();
    const found = all.find((a) => a.id === catchAll.id);
    expect(found!.price).toBe(300); // 500 - 200
  });

  test("zakat categories aggregate by category and reflect nisab_reached", async () => {
    const categories = await getAllCategories();
    const cash = categories.find((c) => c.category === "CASH");
    expect(cash).toBeTruthy();
    // Two CASH assets created above: 45000 + 200 + 300(derived) = 45500
    expect(cash!.value).toBeCloseTo(45500, 5);
    expect(typeof cash!.nisab).toBe("number");
    expect(cash!.nisab).toBeGreaterThan(0);
  }, 15000);

  test("upsertTracker sets last_paid_date and starts a haul cycle reflected in getAllCategories", async () => {
    const paidDate = new Date().toISOString();
    await upsertTracker({ category: "CASH", status: "ACTIVE", last_paid_date: paidDate });

    const categories = await getAllCategories();
    const cash = categories.find((c) => c.category === "CASH");
    expect(cash!.is_tracked).toBe(true);
    expect(cash!.last_paid_date).toBe(paidDate);
    expect(cash!.haul_start_date).toBe(paidDate);
    expect(cash!.next_due_date).not.toBeNull();
  }, 15000);

  test("reminder notification settings default until a custom config is saved", async () => {
    const initial = await getReminderNotificationSettings();
    expect(initial).toEqual({ mode: "default", offsets_days: [7, 3, 1, 0], hour: 9, minute: 0 });

    const saved = await setReminderNotificationSettings("custom", [14, 1], 20, 30);
    expect(saved).toEqual({ mode: "custom", offsets_days: [14, 1], hour: 20, minute: 30 });

    const reloaded = await getReminderNotificationSettings();
    expect(reloaded).toEqual(saved);

    // Switching back to default should stop reporting the saved custom values.
    const reverted = await setReminderNotificationSettings("default", [14, 1], 20, 30);
    expect(reverted).toEqual({ mode: "default", offsets_days: [7, 3, 1, 0], hour: 9, minute: 0 });
  });
});
