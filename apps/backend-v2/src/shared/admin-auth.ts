import type { MiddlewareHandler } from "hono";
import type { Env } from "./env.js";

/**
 * Guards an admin-only route with a shared-secret bearer token
 * (ADMIN_REFRESH_SECRET). Cross-cutting concern, not owned by any one
 * feature — if a second admin-only route shows up later, it reuses this
 * same middleware rather than each feature rolling its own check.
 */
export function requireAdminSecret(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const auth = c.req.header("Authorization");
    if (!c.env.ADMIN_REFRESH_SECRET || auth !== `Bearer ${c.env.ADMIN_REFRESH_SECRET}`) {
      return c.json({ ran: false, reason: "unauthorized" }, 401);
    }
    await next();
  };
}
