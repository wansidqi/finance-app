import { getDb } from "./db";

// Ported from apps/backend/pkg/nisab (Go) — keep in sync if that changes.

/** Sharia nisab threshold: 85 grams of gold. */
export const GRAMS_REQUIRED = 85.0;

/** Converts BNM's Kijang Emas price (quoted per troy ounce) to per-gram. */
const GRAMS_PER_TROY_OUNCE = 31.1034768;

/** Used only when BNM has never been reachable and nothing is cached yet. */
export const FALLBACK_RM = 29740.0;
export const FALLBACK_PRICE_PER_GRAM = FALLBACK_RM / GRAMS_REQUIRED;

const BNM_ENDPOINT = "https://api.bnm.gov.my/public/kijang-emas";
const FETCH_TIMEOUT_MS = 4000;

let breakerUntil = 0;
function breakerOpen(): boolean {
  return Date.now() < breakerUntil;
}
function recordFailure() {
  breakerUntil = Date.now() + 60_000;
}
function recordSuccess() {
  breakerUntil = 0;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d
    .getUTCDate()
    .toString()
    .padStart(2, "0")}`;
}

interface NisabResult {
  pricePerGram: number;
  nisabRM: number;
}

/** Derives nisab from BNM's buying/selling quotes, using their average as the market price. */
export function computeNisab(oneOzBuying: number, oneOzSelling: number): NisabResult {
  const avgPerOz = (oneOzBuying + oneOzSelling) / 2;
  const pricePerGram = avgPerOz / GRAMS_PER_TROY_OUNCE;
  return { pricePerGram, nisabRM: pricePerGram * GRAMS_REQUIRED };
}

interface CachedNisab extends NisabResult {
  cachedOn: string;
}

async function cacheGet(): Promise<CachedNisab | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    price_per_gram: number;
    nisab_rm: number;
    cached_on: string;
  }>("SELECT price_per_gram, nisab_rm, cached_on FROM nisab_cache WHERE id = 1");
  if (!row) return null;
  return { pricePerGram: row.price_per_gram, nisabRM: row.nisab_rm, cachedOn: row.cached_on };
}

async function cacheSet(effectiveDate: string, pricePerGram: number, nisabRM: number, cachedOn: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO nisab_cache (id, effective_date, price_per_gram, nisab_rm, cached_on)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       effective_date = excluded.effective_date,
       price_per_gram = excluded.price_per_gram,
       nisab_rm = excluded.nisab_rm,
       cached_on = excluded.cached_on`,
    effectiveDate,
    pricePerGram,
    nisabRM,
    cachedOn,
  );
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromBNM(): Promise<{ effectiveDate: string; oneOzBuying: number; oneOzSelling: number }> {
  const resp = await fetchWithTimeout(
    BNM_ENDPOINT,
    { headers: { Accept: "application/vnd.BNM.API.v1+json" } },
    FETCH_TIMEOUT_MS,
  );
  if (!resp.ok) throw new Error(`bnm api returned status ${resp.status}`);

  const json = await resp.json();
  const buying = json?.data?.one_oz?.buying;
  const selling = json?.data?.one_oz?.selling;
  if (!buying || !selling) throw new Error("bnm api returned no gold price");

  return { effectiveDate: json.data.effective_date, oneOzBuying: buying, oneOzSelling: selling };
}

/**
 * Returns today's nisab figures, live from BNM when possible, falling back
 * to the last cached value or the fallback constants if BNM has never been
 * reachable.
 */
async function current(): Promise<NisabResult> {
  const cached = await cacheGet();
  const today = todayKey();

  if (cached && cached.cachedOn === today) {
    return { pricePerGram: cached.pricePerGram, nisabRM: cached.nisabRM };
  }

  if (breakerOpen()) {
    if (cached) return { pricePerGram: cached.pricePerGram, nisabRM: cached.nisabRM };
    return { pricePerGram: FALLBACK_PRICE_PER_GRAM, nisabRM: FALLBACK_RM };
  }

  try {
    const fetched = await fetchFromBNM();
    recordSuccess();
    const result = computeNisab(fetched.oneOzBuying, fetched.oneOzSelling);
    await cacheSet(fetched.effectiveDate, result.pricePerGram, result.nisabRM, today);
    return result;
  } catch {
    recordFailure();
    if (cached) return { pricePerGram: cached.pricePerGram, nisabRM: cached.nisabRM };
    return { pricePerGram: FALLBACK_PRICE_PER_GRAM, nisabRM: FALLBACK_RM };
  }
}

/** Current nisab in RM (live BNM price, cached, with a static fallback). */
export async function value(): Promise<number> {
  return (await current()).nisabRM;
}

/** Today's gold price per gram in RM, from the same live/cached source as `value()`. */
export async function pricePerGram(): Promise<number> {
  return (await current()).pricePerGram;
}
