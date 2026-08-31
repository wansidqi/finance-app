package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort     string
	DBPath         string
	GoogleAIAPIKey string
}

func LoadConfig() (*Config, error) {
	// Load .env ONLY for local development
	_ = godotenv.Load() // 👈 ignore error if file not found

	config := &Config{
		ServerPort: getEnv("SERVER_PORT", ""),
		DBPath:     getEnv("DB_PATH", "./sqlite/fiber.sqlite"),
		// Empty when unset — the nisabai package treats a missing key as
		// "AI fallback unavailable" rather than an error, same as every
		// other optional integration in this app.
		GoogleAIAPIKey: getEnv("GOOGLE_AI_API_KEY", ""),
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
