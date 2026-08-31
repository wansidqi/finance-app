export interface Env {
  NISAB_CACHE: KVNamespace;
  // Both secrets — set via `wrangler secret put <NAME>` (prod) or
  // .dev.vars (local dev), never committed.
  GOOGLE_AI_API_KEY: string;
  // Required to call POST /nisab-states/refresh (see features/nisab) —
  // without this, anyone who finds the URL could repeatedly force paid
  // Gemini calls. Not needed for the public GET endpoint.
  ADMIN_REFRESH_SECRET: string;
}
