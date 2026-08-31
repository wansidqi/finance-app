package router

import (
	asset "go-fiber-app/internal/assets"
	"go-fiber-app/internal/liability"
	"go-fiber-app/internal/middleware"
	"go-fiber-app/internal/nisabstate"
	"go-fiber-app/internal/zakat"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func SetupRoutes(app *fiber.App, googleAIAPIKey string) {
	// Setup metrics, health check, and logging
	setupMetrics(app)

	// Middleware
	app.Use(cors.New())
	app.Use(recover.New())
	app.Use(middleware.LoggerMiddleware)

	// API routes
	api := app.Group("/api")

	// Setup feature routes
	asset.SetupAssetRoutes(api)
	liability.SetupLiabilitytRoutes(api)
	zakat.SetupAssetRoutes(api)
	nisabstate.SetupRoutes(api, googleAIAPIKey)
}
