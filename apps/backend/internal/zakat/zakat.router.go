package zakat

import (
	"github.com/gofiber/fiber/v2"
)

func SetupAssetRoutes(router fiber.Router) {
	zakatController := ZakatController(ZakatService())
	router.Get("/get-categories", zakatController.GetAllCategories)

	zakatRouter := router.Group("/zakat-tracker")
	zakatRouter.Put("/", zakatController.Upsert)
}
