import { MalaysiaStateKey, StateNisabRate } from "@/interface/nisab-state";

/**
 * All 14 states' nisab now come from one backend endpoint
 * (apps/backend `GET /api/zakat/nisab-states`), which merges a live scrape
 * of each state's own official zakat authority with a Gemini AI fallback
 * for any state that scrape doesn't cover — both cached server-side and
 * shared across every app install. This file used to run that scrape
 * itself, independently, on every single device (8 external site fetches
 * per sync) — now it just reads one small JSON response instead.
 * `EXPO_PUBLIC_API_URL` is optional: unset, unreachable, or a bad response
 * simply resolves to an empty list, and callers (local/nisab-resolver.ts)
 * fall back further (nationwide gold-price nisab) — never throws.
 */

const FETCH_TIMEOUT_MS = 6000;

// A short in-memory cache: resolveNisab() can be called several times in
// one app session (dashboard render, notification sync, etc.) — without
// this, each call would be a fresh network round trip for data that the
// backend itself already only refreshes monthly-ish.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { rates: StateNisabRate[]; fetchedAt: number } | null = null;

interface BackendStateEntry {
  state: string;
  zakatAgency: string;
  nisabRM: number;
  goldUrufWornGrams?: number;
  sourceUrl?: string;
  isScraped: boolean;
  asOf: string;
}

interface BackendResponse {
  states: BackendStateEntry[];
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAllStateNisabRates(): Promise<StateNisabRate[]> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) return [];

  try {
    const resp = await fetchWithTimeout(`${baseUrl}/api/zakat/nisab-states`);
    if (!resp.ok) return [];

    const json = (await resp.json()) as BackendResponse;
    return (json.states ?? [])
      .filter((e) => e.state && Number.isFinite(e.nisabRM))
      .map((e) => ({
        state: e.state as MalaysiaStateKey,
        nisabRM: e.nisabRM,
        zakatAgency: e.zakatAgency,
        goldUrufWornGrams: e.goldUrufWornGrams ?? null,
        sourceUrl: e.sourceUrl ?? null,
        isScraped: e.isScraped,
        asOf: e.asOf,
      }));
  } catch {
    return [];
  }
}

/** All jurisdictions the backend currently has a figure for — scraped or AI. Empty if no backend is configured/reachable. */
export async function getAllStateNisabRates(): Promise<StateNisabRate[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.rates;

  const rates = await fetchAllStateNisabRates();
  cache = { rates, fetchedAt: Date.now() };
  return rates;
}

export async function getStateNisab(state: MalaysiaStateKey): Promise<StateNisabRate | null> {
  const all = await getAllStateNisabRates();
  return all.find((r) => r.state === state) ?? null;
}

/** Forces the next getAllStateNisabRates() call to hit the network again — used after a manual "refresh" action instead of waiting out the TTL. */
export function invalidateStateNisabCache(): void {
  cache = null;
}
