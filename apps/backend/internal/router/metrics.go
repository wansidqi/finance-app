package router

import (
	"runtime"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gofiber/fiber/v2"
)

func setupMetrics(app *fiber.App) {
	var (
		startTime     = time.Now()
		requestsCount uint64

		// RPS tracking
		reqsThisSecond uint64
		rps            uint64

		// Log buffer
		logs     = make([]string, 0, 50)
		logMutex sync.Mutex
	)

	// RPS ticker
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		for range ticker.C {
			rps = atomic.SwapUint64(&reqsThisSecond, 0)
		}
	}()

	app.Use(func(c *fiber.Ctx) error {
		path := c.Path()

		if path != "/health" && path != "/metrics" && path != "/" {
			atomic.AddUint64(&requestsCount, 1)
			atomic.AddUint64(&reqsThisSecond, 1)

			logMutex.Lock()
			logs = append(logs,
				time.Now().Format("15:04:05")+" "+
					c.Method()+" "+path,
			)
			if len(logs) > 50 {
				logs = logs[1:]
			}
			logMutex.Unlock()
		}

		return c.Next()
	})

	// Static files
	app.Static("/", "./static")

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	// Metrics endpoint
	app.Get("/metrics", func(c *fiber.Ctx) error {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)

		logMutex.Lock()
		defer logMutex.Unlock()

		return c.JSON(fiber.Map{
			"uptime":   time.Since(startTime).Seconds(),
			"requests": atomic.LoadUint64(&requestsCount),
			"rps":      rps,
			"memory":   m.Alloc / 1024 / 1024,
			"logs":     logs,
		})
	})
}
