# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

Monorepo, no root package.json/workspace tooling — each app under `apps/` is independent with its own dependencies and commands.

- **`apps/mobile`** — the product. "Zakat Tracker" (branded name), a local-first Expo/React Native personal finance + zakat app for Malaysian users. This is where nearly all active work happens.
- **`apps/backend-v2`** — active Cloudflare Workers (Hono) service. Its only job today is resolving per-state zakat nisab (scrape + Gemini AI fallback, cached in KV, refreshed on a monthly cron). Deployed at the URL in `apps/mobile/.env`'s `EXPO_PUBLIC_API_URL`.
- **`apps/backend`** — legacy Go/Fiber backend from before the app went local-first. Superseded by on-device SQLite for assets/liabilities/zakat, and superseded by `apps/backend-v2` for nisab resolution (see commit `6b922dd`). Not part of the active app's request path; avoid extending it — put new server-side logic in `backend-v2` instead unless told otherwise.

## `apps/mobile` — commands

```bash
npx expo start              # dev server (also: npm run start)
npm run android              # expo run:android
npm run ios                  # expo run:ios
npm run lint                 # expo lint
npm test                     # jest (jest-expo preset)
npx jest local/__tests__/nisab-resolver.test.ts   # single test file
npx jest -t "test name"      # filter by test name
```

Never run an EAS development or preview build (`eas build --profile development|preview`) without the user's explicit go-ahead each time — see `apps/mobile/AGENTS.md`. Local builds (`expo run:android`, `eas build --local`) and `expo start` are fine.

Tests live beside the code they cover, in `__tests__/` folders (e.g. `apps/mobile/local/__tests__/`, `apps/mobile/services/__tests__/`) — not one top-level test tree.

## `apps/backend-v2` — commands

```bash
npm run dev         # wrangler dev (local Cloudflare Workers runtime)
npm run deploy       # wrangler deploy
npm test             # vitest run
npm run typecheck    # tsc --noEmit
```

Secrets (`GOOGLE_AI_API_KEY`, `ADMIN_REFRESH_SECRET`) are never committed — set locally via `.dev.vars` (copy from `.dev.vars.example`) and in prod via `wrangler secret put`.

## `apps/backend` (legacy Go) — commands

```bash
go run cmd/main.go   # or: air (see .air.toml for hot reload)
```

Only touch this if specifically asked to work on the legacy backend.

## Mobile architecture

**Local-first, not local-only.** `expo-sqlite` (`apps/mobile/local/db.ts`) is the single source of truth for every feature — transactions, assets, liabilities, zakat tracking, receipts, documents, reminders. The app works fully offline. The only network calls are: nisab lookup against `backend-v2` (optional, falls back gracefully), an optional LHDN relief-amount sync check, and optional user-initiated Google Drive backup. There is no auth/user-account backend — `user_id` columns exist in the schema but aren't wired to a real auth system.

Layering, thinnest/lowest to highest:

1. **`local/*-service.ts`** — one file per domain (asset, liability, transaction, zakat, reminder, receipt, vault, tax-relief, backup, nisab, hijri...). Owns SQL against the tables it's responsible for. `local/db.ts` holds the full `CREATE TABLE IF NOT EXISTS` schema plus a migration runner — schema changes go here, additively (new columns/tables), since this runs against real on-device data with no server-side migration story.
2. **`services/*.ts`** — cross-cutting concerns on top of the local layer: notification scheduling (`*-notifications.ts`), background tasks (`*-background-task.ts`, via `expo-task-manager`/`expo-background-task`), backup/restore orchestration, Google Drive client, encryption.
3. **`state/*.tsx`** — small amount of global UI state via `jotai` (most state is local-component or comes straight from TanStack Query wrapping the `local/` services).
4. **`app/`** — Expo Router file-based routes/screens (tabs in `app/(tabs)/`, detail screens like `app/asset/[id].tsx`).
5. **`components/`** — presentational/composed UI, grouped by feature (`components/asset/`, `components/document-vault/`, `components/privacy/`, ...).

Path alias: `@/*` maps to `apps/mobile/*` (see `tsconfig.json`).

### Nisab resolution (representative cross-cutting flow)

`local/nisab-resolver.ts` → `local/nisab-state-sync-service.ts` (fetches all 14 states' rates from `backend-v2`'s `GET /api/zakat/nisab-states`, 5-min in-memory cache, empty list if `EXPO_PUBLIC_API_URL` is unset/unreachable) → falls back per-state to `local/nisab-static-fallback.ts`'s hand-collected snapshot (see `local/SCRAPING.md` for sourcing notes/status per state) → if still nothing, resolves to an explicit "unavailable" (`NisabSource.kind === "unavailable"`), never a synthesized number. Resolution prefers the user's GPS-detected state (`local/state-location-service.ts`), then PPZ-MAIWP as a generic fallback.

### Backups

AES-256 client-side encryption (`services/backup-encryption.ts`, key never leaves device) before upload to Google Drive (`services/google-drive-client.ts`), with GFS-style (daily/weekly/monthly) retention (`services/backup-naming.ts`) and a local pre-restore safety snapshot. Dev and prod use separate Drive folders — do not conflate them when debugging backup issues.

## `apps/backend-v2` architecture

Feature-folder Hono app: `src/index.ts` is a thin wrapper (HTTP fetch handler + the `scheduled()` cron handler for the monthly nisab refresh); `src/routes/index.ts` is the *only* place that mounts feature routers onto the app — don't call `app.route()` elsewhere. Each feature (currently just `nisab`) is self-contained under `src/features/<name>/` with `.controller`/`.service`/`.model`/`.routes` files. `refreshNisabCache` (in `nisab.service.ts`) is idempotent per calendar month — both the cron trigger and any manual/admin-triggered refresh call the same function, which checks `isRefreshDueThisMonth` itself before hitting Gemini, so redundant triggers don't cause redundant API calls.

## Key docs worth reading before large changes

- `apps/mobile/README.md` — product overview, tech stack, what's shipped
- `apps/mobile/env.md` — Android/iOS package IDs, keystores, SHA-1s, Google OAuth client setup per build profile; read this before touching build/signing/Google Sign-In config, it documents real footguns already hit (e.g. don't put `APP_VARIANT` in `.env`)
- `apps/mobile/local/SCRAPING.md` — per-state nisab source status and sourcing notes
- `apps/mobile/plan.md`, `apps/mobile/pages.md` — longer-running planning/spec notes (large files; grep rather than reading in full)
