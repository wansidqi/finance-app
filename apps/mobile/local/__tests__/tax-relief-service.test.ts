/**
 * Real-SQLite integration test (see integration.test.ts) for the Tax
 * Relief cap/summary math: default cap seeding, claimed-vs-cap aggregation
 * grouped by category, and that editing a cap sticks (isn't clobbered by
 * later seeding calls for the same year).
 */
jest.mock("expo-sqlite", () => {
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(":memory:");

  const facade = {
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
  };

  return {
    openDatabaseAsync: async () => ({
      ...facade,
      withExclusiveTransactionAsync: async (task: (txn: typeof facade) => Promise<void>) => {
        await task(facade);
      },
    }),
  };
});

import { DEFAULT_TAX_RELIEF_CAPS } from "@/interface/tax-relief";
import { createAccount } from "../account-service";
import { getCapsForYear, getReliefSummary, getReliefTransactions, updateCap } from "../tax-relief-service";
import { createTransaction } from "../transaction-service";

describe("tax relief caps + summary (real SQLite via node:sqlite)", () => {
  test("seeds default caps for a year not yet touched", async () => {
    const caps = await getCapsForYear(2026);
    expect(caps).toHaveLength(Object.keys(DEFAULT_TAX_RELIEF_CAPS).length);
    const lifestyle = caps.find((c) => c.category_key === "lifestyle");
    expect(lifestyle?.cap_amount).toBe(DEFAULT_TAX_RELIEF_CAPS.lifestyle);
  });

  test("editing a cap persists and isn't overwritten by re-seeding", async () => {
    await updateCap(2026, "lifestyle", 3000);
    const caps = await getCapsForYear(2026);
    expect(caps.find((c) => c.category_key === "lifestyle")?.cap_amount).toBe(3000);
  });

  test("summary aggregates claimed amounts per category and flags over-cap", async () => {
    const account = await createAccount({ name: "Wallet", type: "cash", balance: 0 });

    await createTransaction({
      account_id: account.id,
      type: "expense",
      amount: 1500,
      tax_relief_category: "lifestyle",
      assessment_year: 2027,
    });
    await createTransaction({
      account_id: account.id,
      type: "expense",
      amount: 1200,
      tax_relief_category: "lifestyle",
      assessment_year: 2027,
    });
    // Different year — must not leak into the 2027 summary.
    await createTransaction({
      account_id: account.id,
      type: "expense",
      amount: 999,
      tax_relief_category: "lifestyle",
      assessment_year: 2099,
    });
    // Untagged expense — must not appear in any relief summary.
    await createTransaction({ account_id: account.id, type: "expense", amount: 50 });

    const summary = await getReliefSummary(2027);
    const lifestyle = summary.find((s) => s.category_key === "lifestyle")!;
    expect(lifestyle.claimed).toBe(2700);
    expect(lifestyle.cap).toBe(DEFAULT_TAX_RELIEF_CAPS.lifestyle);
    expect(lifestyle.over_cap).toBe(2700 > DEFAULT_TAX_RELIEF_CAPS.lifestyle);

    const other = summary.find((s) => s.category_key === "medical_self_spouse_child")!;
    expect(other.claimed).toBe(0);

    const transactions = await getReliefTransactions(2027);
    expect(transactions).toHaveLength(2);
    expect(transactions.every((t) => t.category_key === "lifestyle")).toBe(true);
  });
});
