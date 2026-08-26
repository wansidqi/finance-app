package middleware

import (
	"go-fiber-app/pkg/response"

	"github.com/gofiber/fiber/v2"
)

func AuthMiddleware(c *fiber.Ctx) error {
	token := c.Get("Authorization")
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(response.ErrorResponse("Unauthorized", "Missing authorization token"))
	}

	// TODO: Implement proper token validation
	return c.Next()
}
