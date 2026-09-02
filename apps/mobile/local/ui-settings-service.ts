import { getDb } from "./db";

export async function getHideAmounts(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ hide_amounts: number }>(
    "SELECT hide_amounts FROM ui_settings WHERE id = 1",
  );
  return row?.hide_amounts === 1;
}

export async function setHideAmounts(value: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO ui_settings (id, hide_amounts, updated_at)
     VALUES (1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       hide_amounts = excluded.hide_amounts,
       updated_at = CURRENT_TIMESTAMP`,
    value ? 1 : 0,
  );
}
