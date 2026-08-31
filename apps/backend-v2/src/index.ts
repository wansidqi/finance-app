import { Hono } from "hono";
import { cors } from "hono/cors";
import { refreshNisabCache } from "./features/nisab/nisab.service.js";
import { registerRoutes } from "./routes/index.js";
import type { Env } from "./shared/env.js";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());
registerRoutes(app);

app.get("/", (c) => c.text("finance-notifier backend-v2 — ok"));

export default {
  fetch: app.fetch,

  // Fires on the Cron Trigger in wrangler.toml (currently: 03:00 UTC on the
  // 1st of every month). refreshNisabCache still checks isRefreshDueThisMonth
  // itself, so an accidental extra trigger (or a manual `wrangler dev --test-scheduled`)
  // doesn't force a redundant Gemini call in the same month. If a second
  // feature ever needs its own scheduled job, this is where it gets added —
  // this file stays a thin wrapper, the actual logic lives in each
  // feature's service.
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      refreshNisabCache(env).catch((err) => {
        console.error("scheduled nisab refresh failed:", err);
      }),
    );
  },
};
