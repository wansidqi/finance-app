/**
 * Verifies the Accounts-removal migration (local/db.ts, `dropAccountColumnsFromTransactions`,
 * schema version 5): a `transactions` table pre-populated with the old
 * `account_id`/`transfer_account_id` columns gets restructured to the
 * new account-less shape, preserving existing rows and recategorizing
 * `transfer` rows to `expense` (there's no second account to transfer to
 * anymore, but the amount/date/notes are worth keeping).
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

describe("Accounts-removal migration (real SQLite via node:sqlite)", () => {
  test("restructures a pre-existing transactions table and preserves rows", async () => {
    const SQLite = require("expo-sqlite");
    const db = await SQLite.openDatabaseAsync("test.db");

    // Simulate a device on the old (pre-migration) schema.
    await db.execAsync(`
      CREATE TABLE accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, balance REAL NOT NULL DEFAULT 0);
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        transfer_account_id INTEGER NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        occurred_at TEXT NOT NULL,
        description TEXT NULL,
        note TEXT NULL,
        tax_relief_category TEXT NULL,
        assessment_year INTEGER NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NULL
      );
      PRAGMA user_version = 4;
    `);
    await db.runAsync(
      "INSERT INTO accounts (id, name, balance) VALUES (1, 'Wallet', 100)",
    );
    await db.runAsync(
      `INSERT INTO transactions (account_id, type, amount, occurred_at, description, note, created_at, updated_at)
       VALUES (1, 'expense', 30, '2026-01-01T00:00:00.000Z', 'Groceries', NULL, '2026-01-01T00:00:00.000Z', NULL)`,
    );
    await db.runAsync(
      `INSERT INTO transactions (account_id, transfer_account_id, type, amount, occurred_at, description, note, created_at, updated_at)
       VALUES (1, 2, 'transfer', 50, '2026-01-02T00:00:00.000Z', NULL, NULL, '2026-01-02T00:00:00.000Z', NULL)`,
    );

    // getDb() re-runs SCHEMA (no-op on the already-existing tables above)
    // then migrate(), which is where the restructure actually happens.
    const { getDb } = require("../db");
    const migratedDb = await getDb();

    const cols = await migratedDb.getAllAsync("PRAGMA table_info(transactions)");
    expect(cols.map((c: any) => c.name)).not.toContain("account_id");
    expect(cols.map((c: any) => c.name)).not.toContain("transfer_account_id");

    const rows = await migratedDb.getAllAsync("SELECT * FROM transactions ORDER BY id");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ type: "expense", amount: 30, description: "Groceries" });
    // The transfer row survived, recategorized since there's no account to transfer between.
    expect(rows[1]).toMatchObject({ type: "expense", amount: 50 });

    // The old accounts table is left alone (untouched, just unreferenced).
    const accountRows = await migratedDb.getAllAsync("SELECT * FROM accounts");
    expect(accountRows).toHaveLength(1);
  });
});
