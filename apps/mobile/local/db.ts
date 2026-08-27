import * as SQLite from "expo-sqlite";

const DB_NAME = "finance-notifier.db";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NULL,
  platform TEXT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity REAL NULL,
  price REAL NULL,
  unit TEXT NULL,
  goal REAL NULL,
  cost_basis REAL NULL,
  note TEXT NULL,
  is_calculate INTEGER NOT NULL DEFAULT 1,
  platform_total REAL NULL,
  use_live_gold_price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS liabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NULL,
  category TEXT NOT NULL,
  name TEXT NULL,
  total_balance REAL NULL,
  monthly_payment REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS zakat_tracker (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NULL,
  category TEXT NOT NULL,
  last_paid_date TEXT NULL,
  haul_start_date TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (category)
);

CREATE TABLE IF NOT EXISTS hijri_cache (
  gregorian_date TEXT PRIMARY KEY,
  hijri_date TEXT NOT NULL,
  cached_on TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS nisab_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  effective_date TEXT NOT NULL,
  price_per_gram REAL NOT NULL,
  nisab_rm REAL NOT NULL,
  cached_on TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS zakat_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  combine_categories INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS liability_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  liability_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  paid_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  note TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS payment_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  amount REAL NOT NULL DEFAULT 0,
  recurrence TEXT NOT NULL DEFAULT 'monthly',
  recurrence_interval_days INTEGER NULL,
  next_due_date TEXT NOT NULL,
  last_paid_date TEXT NULL,
  note TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Adds a column to an already-created table if it's missing. Needed
 * because `CREATE TABLE IF NOT EXISTS` above is a no-op on a device whose
 * table already exists from an earlier schema version — plain column
 * additions (like liability_payments.paid_date) never retroactively land
 * on those installs otherwise.
 */
async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  columnDdl: string,
  backfillFrom?: string,
): Promise<void> {
  const existing = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (existing.some((c) => c.name === column)) return;

  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${columnDdl}`);
  if (backfillFrom) {
    await db.runAsync(
      `UPDATE ${table} SET ${column} = ${backfillFrom} WHERE ${column} IS NULL`,
    );
  }
}

/**
 * Ordered, numbered migration steps applied via SQLite's built-in
 * `PRAGMA user_version` counter. Only steps with a version greater than the
 * database's current version run, and each is idempotent (safe to re-run on
 * a fresh install where `SCHEMA` above already created the target column) —
 * but framing it this way, rather than re-running every step unconditionally
 * on every launch, means a *future* migration is free to do something
 * non-idempotent (e.g. a one-time data backfill) without needing its own
 * existence check.
 *
 * To add a migration: append a new entry with the next integer version.
 * Never change the version number or behavior of an existing entry once it
 * has shipped.
 */
const MIGRATIONS: { version: number; run: (db: SQLite.SQLiteDatabase) => Promise<void> }[] = [
  {
    version: 1,
    run: (db) => ensureColumn(db, "liability_payments", "paid_date", "paid_date TEXT", "created_at"),
  },
  {
    version: 2,
    run: (db) => ensureColumn(db, "liability_payments", "note", "note TEXT"),
  },
];

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const [{ user_version: currentVersion }] = await db.getAllAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    await migration.run(db);
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }
}

/**
 * Opens (and lazily initializes) the on-device database. Safe to call from
 * anywhere — repeated calls share the same connection/init work.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(SCHEMA);
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}
