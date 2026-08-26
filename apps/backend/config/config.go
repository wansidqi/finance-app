package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort string
	DBPath     string
}

func LoadConfig() (*Config, error) {
	// Load .env ONLY for local development
	_ = godotenv.Load() // 👈 ignore error if file not found

	config := &Config{
		ServerPort: getEnv("SERVER_PORT", ""),
		DBPath:     getEnv("DB_PATH", "./sqlite/fiber.sqlite"),
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
