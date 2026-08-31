// Request/response handling only — delegates all actual logic to
// nisab.service.ts, never touches the model or Gemini client directly.
import type { Context } from "hono";
import type { Env } from "../../shared/env.js";
import { getAllStates, refreshNisabCache } from "./nisab.service.js";

type NisabContext = Context<{ Bindings: Env }>;

// GET /api/zakat/nisab-states — always 200. An empty `states` array (cold
// KV, nothing refreshed yet) is a valid "nothing available" response, not
// a server error, so apps/mobile's fallback tier (PPZ, then "unavailable")
// treats a missing figure the same way whether this is cold or down.
export async function getAllStatesHandler(c: NisabContext) {
  const states = await getAllStates(c.env.NISAB_CACHE);
  return c.json({ states });
}

// POST /api/zakat/nisab-states/refresh — manual trigger for testing/ops,
// bypassing the monthly due-check. Auth is enforced by the
// requireAdminSecret middleware on the route, not here. Not linked from
// the mobile app; this is an operator escape hatch (e.g. to seed the
// cache right after deploying, rather than waiting for the 1st-of-month
// cron).
export async function refreshHandler(c: NisabContext) {
  try {
    const result = await refreshNisabCache(c.env, true);
    return c.json(result);
  } catch (err) {
    return c.json({ ran: false, reason: (err as Error).message }, 502);
  }
}
