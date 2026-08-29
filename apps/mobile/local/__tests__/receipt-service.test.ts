/**
 * Real-SQLite integration test (see integration.test.ts) covering receipt
 * attachments: BLOB round-trip fidelity, metadata reads never touching the
 * BLOB, and that deleting a transaction also deletes its receipts (there's
 * no DB-level cascade since the foreign_keys pragma is off).
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

import {
  addReceipt,
  deleteReceipt,
  getReceiptData,
  getReceiptsByTransaction,
} from "../receipt-service";
import { createTransaction, deleteTransaction } from "../transaction-service";

describe("receipt attachments (real SQLite via node:sqlite)", () => {
  test("stores and reads back BLOB bytes unmodified", async () => {
    const txn = await createTransaction({ type: "expense", amount: 25 });

    const bytes = new Uint8Array([1, 2, 3, 250, 255, 0]);
    const created = await addReceipt({
      transaction_id: txn.id,
      file_name: "receipt.jpg",
      mime_type: "image/jpeg",
      bytes,
    });

    const full = await getReceiptData(created.id);
    expect(full).not.toBeNull();
    expect(Array.from(full!.data)).toEqual(Array.from(bytes));
    expect(full!.mime_type).toBe("image/jpeg");
    expect(full!.file_name).toBe("receipt.jpg");
  });

  test("list metadata excludes the BLOB column", async () => {
    const txn = await createTransaction({ type: "expense", amount: 25 });

    await addReceipt({
      transaction_id: txn.id,
      file_name: "invoice.pdf",
      mime_type: "application/pdf",
      bytes: new Uint8Array([9, 9, 9]),
    });

    const list = await getReceiptsByTransaction(txn.id);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ file_name: "invoice.pdf", mime_type: "application/pdf", size_bytes: 3 });
    expect((list[0] as any).data).toBeUndefined();
  });

  test("deleting a receipt removes it from the list", async () => {
    const txn = await createTransaction({ type: "expense", amount: 25 });

    const created = await addReceipt({
      transaction_id: txn.id,
      file_name: "a.jpg",
      mime_type: "image/jpeg",
      bytes: new Uint8Array([1]),
    });

    await deleteReceipt(created.id);
    expect(await getReceiptsByTransaction(txn.id)).toHaveLength(0);
  });

  test("deleting a transaction also deletes its receipts", async () => {
    const txn = await createTransaction({ type: "expense", amount: 25 });

    await addReceipt({
      transaction_id: txn.id,
      file_name: "a.jpg",
      mime_type: "image/jpeg",
      bytes: new Uint8Array([1]),
    });
    await addReceipt({
      transaction_id: txn.id,
      file_name: "b.jpg",
      mime_type: "image/jpeg",
      bytes: new Uint8Array([2]),
    });

    await deleteTransaction(txn.id);
    expect(await getReceiptsByTransaction(txn.id)).toHaveLength(0);
  });
});
