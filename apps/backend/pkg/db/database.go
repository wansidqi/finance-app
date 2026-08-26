package db

import (
	"go-fiber-app/config"
	"os"
	"path/filepath"
	"strings"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

var DB *sqlx.DB

const schema = `
CREATE TABLE IF NOT EXISTS assets (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NULL,
	platform VARCHAR(100) NULL,
	category VARCHAR(100) NOT NULL,
	name VARCHAR(255) NOT NULL,
	quantity REAL NULL,
	price REAL NULL,
	unit VARCHAR(50) NULL,
	goal REAL NULL,
	cost_basis REAL NULL,
	note TEXT NULL,
	is_calculate BOOLEAN NOT NULL DEFAULT 1,
	status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS liabilities (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NULL,
	category VARCHAR(100) NOT NULL,
	name VARCHAR(255) NULL,
	total_balance REAL NULL,
	monthly_payment REAL NOT NULL DEFAULT 0,
	status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS zakat_tracker (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NULL,
	category VARCHAR(100) NOT NULL,
	last_paid_date DATETIME NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (category)
);
`

var assetColumnMigrations = []string{
	"ALTER TABLE assets ADD COLUMN platform VARCHAR(100) NULL",
	"ALTER TABLE assets ADD COLUMN cost_basis REAL NULL",
	"ALTER TABLE assets ADD COLUMN is_calculate BOOLEAN NOT NULL DEFAULT 1",
	"ALTER TABLE assets ADD COLUMN note TEXT NULL",
}

func migrateSchema(db *sqlx.DB) error {
	for _, stmt := range assetColumnMigrations {
		if _, err := db.Exec(stmt); err != nil && !strings.Contains(err.Error(), "duplicate column name") {
			return err
		}
	}

	// Normalize legacy mixed-case categories (e.g. "Cash") so they merge
	// with the uppercase categories the app now always writes (e.g. "CASH") —
	// otherwise they'd silently fragment into separate zakat buckets, and
	// zakat_tracker rows would stop matching their asset category.
	if _, err := db.Exec("UPDATE assets SET category = UPPER(category) WHERE category != UPPER(category)"); err != nil {
		return err
	}
	if _, err := db.Exec("UPDATE zakat_tracker SET category = UPPER(category) WHERE category != UPPER(category)"); err != nil {
		return err
	}

	return nil
}

func GetDB() *sqlx.DB {
	return DB
}

func InitDB(cfg *config.Config) error {
	if dir := filepath.Dir(cfg.DBPath); dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	dsn := cfg.DBPath + "?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)"

	db, err := sqlx.Open("sqlite", dsn)
	if err != nil {
		return err
	}

	if err := db.Ping(); err != nil {
		return err
	}

	if _, err := db.Exec(schema); err != nil {
		return err
	}

	if err := migrateSchema(db); err != nil {
		return err
	}

	DB = db
	return nil
}
