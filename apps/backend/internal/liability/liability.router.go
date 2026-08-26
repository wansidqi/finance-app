package liability

import "github.com/gofiber/fiber/v2"

func SetupLiabilitytRoutes(router fiber.Router) {
	liabilityController := LiabilityController(LiabilityService())

	liabilityRouter := router.Group("/liabilities")
	liabilityRouter.Post("/", liabilityController.create)
	liabilityRouter.Get("/", liabilityController.getAll)
	liabilityRouter.Get("/:id", liabilityController.getById)
	liabilityRouter.Delete("/:id", liabilityController.delete)
	liabilityRouter.Put("/:id", liabilityController.update)
}
