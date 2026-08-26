package liability

import (
	"go-fiber-app/pkg/response"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type Controller struct {
	service *Service
}

func LiabilityController(service *Service) *Controller {
	return &Controller{service: service}
}

func (c *Controller) create(ctx *fiber.Ctx) error {
	liability := new(Liability)
	if err := ctx.BodyParser(liability); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(response.ErrorResponse("Invalid request body", err.Error()))
	}

	res, err := c.service.CreateLiability(liability)

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to create liability", err.Error()))
	}
	return ctx.Status(fiber.StatusCreated).JSON(res)
}

func (c *Controller) getAll(ctx *fiber.Ctx) error {
	res, err := c.service.GetAllLiabilities()

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to get all liabilities", err.Error()))
	}
	return ctx.Status(fiber.StatusCreated).JSON(res)
}

func (c *Controller) getById(ctx *fiber.Ctx) error {
	id, err := ctx.ParamsInt("id")

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Invalid id", err.Error()))
	}

	res, err := c.service.GetLiability(id)

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to get liability", err.Error()))
	}
	return ctx.Status(fiber.StatusCreated).JSON(res)
}

func (c *Controller) update(ctx *fiber.Ctx) error {

	id, err := ctx.ParamsInt("id")

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Invalid id", err.Error()))
	}

	liability := new(UpdateLiabilityRequest)

	if err := ctx.BodyParser(liability); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(response.ErrorResponse("Invalid request body", err.Error()))
	}

	res, err := c.service.UpdateLiability(id, liability)

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to update liability", err.Error()))
	}
	return ctx.Status(fiber.StatusCreated).JSON(res)
}

func (c *Controller) delete(ctx *fiber.Ctx) error {
	id, err := ctx.ParamsInt("id")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(response.ErrorResponse("Invalid liability ID", err.Error()))
	}
	err = c.service.Delete(id)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to delete liability with ID: "+strconv.Itoa(id), err.Error()))
	}
	return ctx.Status(fiber.StatusOK).JSON(response.SuccessResponse("liability deleted successfully", nil))
}
