package middleware

import (
	"go-fiber-app/pkg/logger"

	"github.com/gofiber/fiber/v2"
)

func LoggerMiddleware(c *fiber.Ctx) error {
	logger.InfoLogger.Printf("%s %s", c.Method(), c.Path())
	return c.Next()
}
