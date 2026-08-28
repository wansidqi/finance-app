/**
 * Real-SQLite integration test (see integration.test.ts) focused on the
 * one part of this feature where a bug would silently corrupt money: the
 * atomic balance math in transaction-service. Exercises the actual
 * account-service/transaction-service modules unmodified.
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
      // node:sqlite is synchronous under the hood, so running the task
      // against the same facade (no real BEGIN/COMMIT) is enough to verify
      // the business logic's read-modify-write sequencing is correct.
      withExclusiveTransactionAsync: async (task: (txn: typeof facade) => Promise<void>) => {
        await task(facade);
      },
    }),
  };
});

import { createAccount, getAccountById } from "../account-service";
import { createTransaction, deleteTransaction, updateTransaction } from "../transaction-service";

describe("accounts + transactions (real SQLite via node:sqlite)", () => {
  test("income increases balance, expense decreases it", async () => {
    const account = await createAccount({ name: "Wallet", type: "cash", balance: 100 });

    await createTransaction({ account_id: account.id, type: "income", amount: 50 });
    expect((await getAccountById(account.id))!.balance).toBe(150);

    await createTransaction({ account_id: account.id, type: "expense", amount: 30 });
    expect((await getAccountById(account.id))!.balance).toBe(120);
  });

  test("transfer debits the source and credits the destination", async () => {
    const from = await createAccount({ name: "Bank A", type: "bank", balance: 200 });
    const to = await createAccount({ name: "Bank B", type: "bank", balance: 0 });

    await createTransaction({
      account_id: from.id,
      transfer_account_id: to.id,
      type: "transfer",
      amount: 75,
    });

    expect((await getAccountById(from.id))!.balance).toBe(125);
    expect((await getAccountById(to.id))!.balance).toBe(75);
  });

  test("updating a transaction's amount reverses the old effect before applying the new one", async () => {
    const account = await createAccount({ name: "Savings", type: "savings", balance: 1000 });
    const txn = await createTransaction({ account_id: account.id, type: "expense", amount: 100 });
    expect((await getAccountById(account.id))!.balance).toBe(900);

    await updateTransaction(txn.id, { amount: 250 });
    expect((await getAccountById(account.id))!.balance).toBe(750);
  });

  test("switching a transaction's type re-signs the balance effect correctly", async () => {
    const account = await createAccount({ name: "Current", type: "bank", balance: 500 });
    const txn = await createTransaction({ account_id: account.id, type: "expense", amount: 100 });
    expect((await getAccountById(account.id))!.balance).toBe(400);

    await updateTransaction(txn.id, { type: "income" });
    expect((await getAccountById(account.id))!.balance).toBe(600);
  });

  test("deleting a transaction reverses its effect", async () => {
    const account = await createAccount({ name: "Cash", type: "cash", balance: 300 });
    const txn = await createTransaction({ account_id: account.id, type: "income", amount: 200 });
    expect((await getAccountById(account.id))!.balance).toBe(500);

    await deleteTransaction(txn.id);
    expect((await getAccountById(account.id))!.balance).toBe(300);
  });

  test("deleting a transfer reverses both sides", async () => {
    const from = await createAccount({ name: "Bank C", type: "bank", balance: 200 });
    const to = await createAccount({ name: "Bank D", type: "bank", balance: 50 });
    const txn = await createTransaction({
      account_id: from.id,
      transfer_account_id: to.id,
      type: "transfer",
      amount: 60,
    });
    expect((await getAccountById(from.id))!.balance).toBe(140);
    expect((await getAccountById(to.id))!.balance).toBe(110);

    await deleteTransaction(txn.id);
    expect((await getAccountById(from.id))!.balance).toBe(200);
    expect((await getAccountById(to.id))!.balance).toBe(50);
  });

  test("rejects a transfer to the same account and a non-positive amount", async () => {
    const account = await createAccount({ name: "Solo", type: "bank", balance: 100 });

    await expect(
      createTransaction({ account_id: account.id, transfer_account_id: account.id, type: "transfer", amount: 10 }),
    ).rejects.toThrow();

    await expect(
      createTransaction({ account_id: account.id, type: "expense", amount: 0 }),
    ).rejects.toThrow();
  });
});
