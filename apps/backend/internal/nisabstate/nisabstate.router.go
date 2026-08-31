package nisabstate

import (
	"go-fiber-app/internal/nisabai"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(router fiber.Router, googleAIAPIKey string) {
	service := NewService(nisabai.NewService(googleAIAPIKey))
	controller := NisabStateController(service)

	zakatRouter := router.Group("/zakat")
	zakatRouter.Get("/nisab-states", controller.GetAllStates)
}
