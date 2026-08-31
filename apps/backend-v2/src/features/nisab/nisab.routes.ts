import { Hono } from "hono";
import { requireAdminSecret } from "../../shared/admin-auth.js";
import type { Env } from "../../shared/env.js";
import { getAllStatesHandler, refreshHandler } from "./nisab.controller.js";

export const nisabRoutes = new Hono<{ Bindings: Env }>();

nisabRoutes.get("/nisab-states", getAllStatesHandler);
nisabRoutes.post("/nisab-states/refresh", requireAdminSecret(), refreshHandler);
