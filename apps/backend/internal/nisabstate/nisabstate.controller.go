package nisabstate

import (
	"github.com/gofiber/fiber/v2"
)

type Controller struct {
	service *Service
}

func NisabStateController(service *Service) *Controller {
	return &Controller{service: service}
}

// GetAllStates always returns 200 — an empty `states` array (nothing
// scraped or AI-cached yet) is a valid "nothing available" response, not a
// server error, so the app's own further fallback tiers (PPZ, then the
// nationwide gold-price nisab) can treat a missing figure the same way
// whether the backend is cold or just doesn't have that state yet.
func (c *Controller) GetAllStates(ctx *fiber.Ctx) error {
	result := c.service.GetAllStates()
	return ctx.Status(fiber.StatusOK).JSON(result)
}
