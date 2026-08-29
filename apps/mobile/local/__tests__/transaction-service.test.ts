/**
 * Real-SQLite integration test (see integration.test.ts) for the
 * account-less transaction model: plain CRUD with no balance/account
 * side effects to verify (that concept was removed — see plan.md Phase 3).
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
    openDatabaseAsync: async () => facade,
  };
});

import { createTransaction, deleteTransaction, getAllTransactions, updateTransaction } from "../transaction-service";

describe("transactions (real SQLite via node:sqlite)", () => {
  test("creates and lists a transaction", async () => {
    const created = await createTransaction({ type: "income", amount: 100, description: "Salary" });
    expect(created.id).toBeGreaterThan(0);

    const all = await getAllTransactions();
    expect(all.find((t) => t.id === created.id)).toMatchObject({ type: "income", amount: 100 });
  });

  test("rejects a non-positive amount", async () => {
    await expect(createTransaction({ type: "expense", amount: 0 })).rejects.toThrow();
  });

  test("updates fields in place", async () => {
    const created = await createTransaction({ type: "expense", amount: 50 });
    const updated = await updateTransaction(created.id, { amount: 75, note: "adjusted" });
    expect(updated).toMatchObject({ amount: 75, note: "adjusted" });
  });

  test("deleting removes it from the list", async () => {
    const created = await createTransaction({ type: "expense", amount: 20 });
    await deleteTransaction(created.id);
    expect((await getAllTransactions()).find((t) => t.id === created.id)).toBeUndefined();
  });
});
