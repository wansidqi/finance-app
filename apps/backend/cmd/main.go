package main

import (
	"bytes"
	"encoding/json"
	"go-fiber-app/config"
	"go-fiber-app/internal/router"
	"go-fiber-app/pkg/db"
	"go-fiber-app/pkg/logger"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {
	// Initialize logger
	logger.InitLogger()

	// Load config
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}

	// Initialize database
	if err := db.InitDB(cfg); err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Go Fiber App",
		JSONDecoder: func(data []byte, v any) error {
			dec := json.NewDecoder(bytes.NewReader(data))
			dec.DisallowUnknownFields()
			return dec.Decode(v)
		},
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "*",
		AllowHeaders: "*",
	}))

	// Setup routes
	router.SetupRoutes(app, cfg.GoogleAIAPIKey)

	// Start server
	log.Fatal(app.Listen(cfg.ServerPort))
}
