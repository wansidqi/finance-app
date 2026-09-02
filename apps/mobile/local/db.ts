import * as SQLite from "expo-sqlite";

export const DB_NAME = "finance-notifier.db";

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
  reminder_id INTEGER NULL REFERENCES payment_reminders(id),
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

CREATE TABLE IF NOT EXISTS reminder_notification_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'default',
  custom_offsets_days TEXT NULL,
  custom_hour INTEGER NULL,
  custom_minute INTEGER NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS backup_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  auto_backup_enabled INTEGER NOT NULL DEFAULT 0,
  encryption_enabled INTEGER NOT NULL DEFAULT 0,
  retention_daily INTEGER NOT NULL DEFAULT 1,
  retention_weekly INTEGER NOT NULL DEFAULT 0,
  retention_monthly INTEGER NOT NULL DEFAULT 0,
  google_account_email TEXT NULL,
  last_backup_at TEXT NULL,
  last_backup_status TEXT NULL,
  last_backup_error TEXT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  description TEXT NULL,
  note TEXT NULL,
  tax_relief_category TEXT NULL,
  assessment_year INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS tax_relief_caps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_year INTEGER NOT NULL,
  category_key TEXT NOT NULL,
  cap_amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (assessment_year, category_key)
);

CREATE TABLE IF NOT EXISTS receipt_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS lhdn_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_checked_at TEXT NULL,
  pending_diffs TEXT NULL,
  last_unmatched TEXT NULL,
  last_error TEXT NULL
);

CREATE TABLE IF NOT EXISTS nisab_state_rates (
  state_key TEXT PRIMARY KEY,
  nisab_rm REAL NULL,
  source_url TEXT NULL,
  last_checked_at TEXT NOT NULL,
  last_error TEXT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS nisab_state_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_synced_at TEXT NULL,
  last_notified_nisab_rm REAL NULL,
  last_notified_source_kind TEXT NULL,
  last_notified_source_state TEXT NULL
);

CREATE TABLE IF NOT EXISTS user_location (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state_key TEXT NULL,
  method TEXT NULL,
  raw_region TEXT NULL,
  detected_at TEXT NULL
);

CREATE TABLE IF NOT EXISTS vault_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  data BLOB NOT NULL,
  expiry_date TEXT NULL,
  note TEXT NULL,
  folder TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS ui_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  hide_amounts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS backup_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  drive_file_id TEXT NULL,
  filename TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  app_version TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  encrypted INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  error_message TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
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
 * Accounts (Phase 3) was dropped in favor of a flat, account-less
 * Transactions model — this restructures an existing `transactions` table
 * that still has the old `account_id`/`transfer_account_id` columns
 * (SQLite has no ALTER TABLE DROP COLUMN-with-constraint-change story, so
 * recreate-and-copy is the standard approach). A fresh install's `SCHEMA`
 * above already creates the new shape directly, so this is a no-op there.
 * `transfer`-type rows (the only type that depended on a second account)
 * are recategorized as `expense` — there's no account to transfer between
 * anymore, but the amount/date/notes are still worth keeping. The old
 * `accounts` table itself is left in place, just unreferenced — dropping
 * it outright isn't necessary and a physically-removed table can't be
 * recovered if that turns out to be wrong.
 */
async function dropAccountColumnsFromTransactions(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(transactions)");
  if (!cols.some((c) => c.name === "account_id")) return;

  await db.execAsync(`
    CREATE TABLE transactions_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      description TEXT NULL,
      note TEXT NULL,
      tax_relief_category TEXT NULL,
      assessment_year INTEGER NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    INSERT INTO transactions_new
      (id, type, amount, occurred_at, description, note, tax_relief_category, assessment_year, created_at, updated_at)
    SELECT
      id,
      CASE WHEN type = 'transfer' THEN 'expense' ELSE type END,
      amount, occurred_at, description, note, tax_relief_category, assessment_year, created_at, updated_at
    FROM transactions;
    DROP TABLE transactions;
    ALTER TABLE transactions_new RENAME TO transactions;
  `);
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
  {
    version: 3,
    run: (db) => ensureColumn(db, "transactions", "tax_relief_category", "tax_relief_category TEXT"),
  },
  {
    version: 4,
    run: (db) => ensureColumn(db, "transactions", "assessment_year", "assessment_year INTEGER"),
  },
  {
    version: 5,
    run: dropAccountColumnsFromTransactions,
  },
  {
    version: 6,
    run: async (db) => {
      await ensureColumn(db, "nisab_state_sync_state", "last_notified_nisab_rm", "last_notified_nisab_rm REAL");
      await ensureColumn(db, "nisab_state_sync_state", "last_notified_source_kind", "last_notified_source_kind TEXT");
      await ensureColumn(db, "nisab_state_sync_state", "last_notified_source_state", "last_notified_source_state TEXT");
    },
  },
  {
    // Reminders (Phase: General Reminders) stopped being payment-only —
    // `category`/`amount` are left in place but unused going forward (same
    // approach as the old `accounts` table) rather than fighting SQLite's
    // limited DROP COLUMN story. These columns let each reminder either
    // follow the app-wide notification schedule or override it.
    version: 7,
    run: async (db) => {
      await ensureColumn(
        db,
        "payment_reminders",
        "notification_mode",
        "notification_mode TEXT NOT NULL DEFAULT 'global'",
      );
      await ensureColumn(db, "payment_reminders", "notification_offsets_days", "notification_offsets_days TEXT");
      await ensureColumn(db, "payment_reminders", "notification_hour", "notification_hour INTEGER");
      await ensureColumn(db, "payment_reminders", "notification_minute", "notification_minute INTEGER");
    },
  },
  {
    // `last_unmatched` was added to the `lhdn_sync_state` CREATE TABLE above
    // after that table already existed on installed devices, so
    // CREATE TABLE IF NOT EXISTS never picked it up there.
    version: 8,
    run: (db) => ensureColumn(db, "lhdn_sync_state", "last_unmatched", "last_unmatched TEXT"),
  },
  {
    // `folder` was added to `vault_documents` after the table already
    // existed on this dev build (Document Vault UI review), so
    // CREATE TABLE IF NOT EXISTS never picked it up there.
    version: 9,
    run: (db) => ensureColumn(db, "vault_documents", "folder", "folder TEXT"),
  },
  {
    // Optional payment reminders for liabilities — a liability can link to a
    // row in the existing `payment_reminders` table instead of duplicating
    // its scheduling/notification logic.
    version: 10,
    run: (db) => ensureColumn(db, "liabilities", "reminder_id", "reminder_id INTEGER"),
  },
  {
    // Retention default changed from a 30/12/12 grandfather-father-son
    // schedule to "keep only the newest backup" — only touches rows still
    // sitting on the old shipped default, so a user who already customized
    // their own retention keeps their choice.
    version: 11,
    run: async (db) => {
      await db.runAsync(
        `UPDATE backup_settings
         SET retention_daily = 1, retention_weekly = 0, retention_monthly = 0
         WHERE id = 1 AND retention_daily = 30 AND retention_weekly = 12 AND retention_monthly = 12`,
      );
    },
  },
];

/** The schema version this build of the app understands — a restored backup newer than this can't be safely opened. */
export const CURRENT_SCHEMA_VERSION = MIGRATIONS.reduce((max, m) => Math.max(max, m.version), 0);

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

/**
 * Flushes WAL-mode writes into the main database file and truncates the WAL,
 * so a plain file copy of the main .db file (no matching -wal/-shm sidecar
 * needed) reflects every committed write — used before creating a backup
 * snapshot.
 */
export async function checkpointWal(): Promise<void> {
  const db = await getDb();
  await db.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");
}

/**
 * Closes the current connection and forgets it, so the next `getDb()` call
 * opens a fresh one — needed before a restore overwrites the underlying
 * file out from under an already-open native connection.
 */
export async function closeDb(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  dbPromise = null;
  await db.closeAsync();
}
