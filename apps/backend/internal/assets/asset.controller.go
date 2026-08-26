package asset

import (
	"go-fiber-app/pkg/response"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type Controller struct {
	service *Service
}

func AssetController(service *Service) *Controller {
	return &Controller{service: service}
}

func (c *Controller) create(ctx *fiber.Ctx) error {
	var asset CreateAssetRequest
	if err := ctx.BodyParser(&asset); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(response.ErrorResponse("Invalid request body", err.Error()))
	}

	res, err := c.service.Create(&asset)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to create asset", err.Error()))
	}

	return ctx.Status(fiber.StatusCreated).JSON(response.SuccessResponse("Asset created successfully", res))
}

func (c *Controller) getAll(ctx *fiber.Ctx) error {
	assets, err := c.service.GetAllAssets()

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to fetch assets", err.Error()))
	}

	return ctx.Status(fiber.StatusOK).JSON(assets)
}

func (c *Controller) getById(ctx *fiber.Ctx) error {
	id, err := ctx.ParamsInt("id")

	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(response.ErrorResponse("Invalid asset ID", err.Error()))
	}

	asset, err := c.service.GetAssetById(id)

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to fetch asset with ID: "+strconv.Itoa(id), err.Error()))
	}

	return ctx.Status(fiber.StatusOK).JSON(asset)
}

func (c *Controller) update(ctx *fiber.Ctx) error {
	var asset UpdateAssetRequest
	if err := ctx.BodyParser(&asset); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(response.ErrorResponse("Invalid request body", err.Error()))
	}

	id, err := ctx.ParamsInt("id")

	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(response.ErrorResponse("Invalid asset ID", err.Error()))
	}

	res, err := c.service.Update(id, &asset)

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to update asset with ID: "+strconv.Itoa(id), err.Error()))
	}
	return ctx.Status(fiber.StatusOK).JSON(response.SuccessResponse("Asset updated successfully", res))
}

func (c *Controller) delete(ctx *fiber.Ctx) error {
	id, err := ctx.ParamsInt("id")

	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(response.ErrorResponse("Invalid asset ID", err.Error()))
	}

	err = c.service.Delete(id)

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(response.ErrorResponse("Failed to delete asset with ID: "+strconv.Itoa(id), err.Error()))
	}
	return ctx.Status(fiber.StatusOK).JSON(response.SuccessResponse("Asset deleted successfully", nil))
}
