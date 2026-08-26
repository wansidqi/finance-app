package db

import (
	"fmt"
	"go-fiber-app/config"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

var DB *sqlx.DB

func GetDB() *sqlx.DB {
	return DB
}

func InitDB(cfg *config.Config) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	db, err := sqlx.Open("mysql", dsn)
	if err != nil {
		return err
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return err
	}

	DB = db
	return nil
}
