// Global routes group — the only file that assembles the API surface.
// Every feature's router gets imported and mounted here, under its base
// path; nothing else in the app should call app.route() directly.
import type { Hono } from "hono";
import { nisabRoutes } from "../features/nisab/nisab.routes.js";
import type { Env } from "../shared/env.js";

export function registerRoutes(app: Hono<{ Bindings: Env }>): void {
  app.route("/api/zakat", nisabRoutes);
}
