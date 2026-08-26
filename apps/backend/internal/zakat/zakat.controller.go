package zakat

import (
	"go-fiber-app/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type Controller struct {
	service *Service
}

func ZakatController(service *Service) *Controller {
	return &Controller{service: service}
}

func (c *Controller) GetAllCategories(ctx *fiber.Ctx) error {
	assets, err := c.service.GetAllCategories()
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to fetch assets", err.Error()))
	}
	return ctx.Status(fiber.StatusOK).JSON(assets)
}

func (c *Controller) Upsert(ctx *fiber.Ctx) error {
	tracker := new(UpdateRequest)
	if err := ctx.BodyParser(tracker); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(response.ErrorResponse("Invalid request body", err.Error()))
	}

	err := c.service.UpsertTracker(tracker)

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to update zakat tracker", err.Error()))
	}
	return ctx.Status(fiber.StatusOK).JSON(response.SuccessResponse("Zakat tracker updated successfully", nil))
}
