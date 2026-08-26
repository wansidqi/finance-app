package asset

import (
	"github.com/gofiber/fiber/v2"
)

func SetupAssetRoutes(router fiber.Router) {
	assetController := AssetController(AssetService())

	assetRouter := router.Group("/assets")
	assetRouter.Post("/", assetController.create)
	assetRouter.Get("/", assetController.getAll)
	assetRouter.Get("/:id", assetController.getById)
	assetRouter.Put("/:id", assetController.update)
	assetRouter.Delete("/:id", assetController.delete)
}
