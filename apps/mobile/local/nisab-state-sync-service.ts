import { MalaysiaStateKey, StateNisabRate } from "@/interface/nisab-state";
import { getDb } from "./db";

/**
 * One entry per Malaysian zakat jurisdiction. Unlike the LHDN relief page
 * (one site, one owner), each state's official nisab figure lives on that
 * state's own zakat authority site, so there's no single page to scrape —
 * every entry here points at a different domain with its own markup.
 * `anchorText` must be a verbatim, lowercase phrase taken from that page,
 * near the RM figure, unique enough to locate it (same approach as
 * CATEGORY_ANCHORS in lhdn-relief-sync-service.ts).
 */
export interface StateAuthorityConfig {
  state: MalaysiaStateKey;
  authorityName: string;
  url: string;
  anchorText: string;
  /**
   * Overrides the generic anchor-based HTML scrape for sources that expose
   * structured data instead of a single static figure (e.g. Selangor's
   * half-yearly JSON feed) — `url`/`anchorText` are unused when this is set,
   * kept only for display/reference.
   */
  fetchOverride?: () => Promise<number>;
}

/**
 * Filled in from verified live-page research (URL + exact anchor text
 * confirmed against the real page, not an aggregator, as of 2026-08-29). A
 * jurisdiction absent from this list simply has no live source configured —
 * `getStateNisab` returns null for it and callers fall back to the
 * nationwide gold-price nisab, so an incomplete list degrades gracefully
 * rather than breaking. Jurisdictions deliberately left out, and why:
 *  - Pulau Pinang (ZPP): the only figure found is an income-zakat page's
 *    explicitly year-tagged ("tahun 2025") reference, not the general zakat
 *    harta nisab this app needs — using it risked silently substituting the
 *    wrong kind of figure.
 *  - Kelantan (MAIK): figure is embedded in an image, not text.
 *  - Pahang (MUIP): both candidate domains block plain HTTP fetches
 *    (bot-protection / TLS cert issues).
 *  - Perak (MAIPk): dedicated nisab page is JS/image-rendered; real figures
 *    are only published via one-off news articles with rotating URLs.
 *  - Perlis (MAIPs): every candidate page fetched cleanly but the figure
 *    itself is injected client-side.
 *  - Sarawak (TBS): no static RM figure anywhere; only a dynamic calculator.
 */
const SELANGOR_AJAX_URL = "https://www.zakatselangor.com.my/wp-admin/admin-ajax.php?action=load_nisab_data";

interface SelangorNisabEntry {
  // e.g. "2026 (Julai - Disember)" or "2026 (Jan - Jun)" — year and half-year
  // period bundled into one Malay-language string, not separate fields.
  tahun: string;
  // e.g. "RM 38,748.00"
  jumlah: string;
}

/**
 * LZS revises its published nisab twice a year (Jan-Jun / Jul-Dec) rather
 * than maintaining a single "current" figure, so picking the right entry
 * needs today's date, not just the latest array item — pure and exported so
 * the year/half matching logic is unit-testable without mocking fetch.
 */
export function pickCurrentSelangorEntry(entries: SelangorNisabEntry[], now: Date): SelangorNisabEntry | null {
  const year = String(now.getFullYear());
  const isFirstHalf = now.getMonth() < 6; // Date.getMonth() is 0-indexed: 0-5 = Jan-Jun
  const halfMarker = isFirstHalf ? "jan" : "julai";

  return (
    entries.find((e) => {
      const normalized = e.tahun.toLowerCase();
      return normalized.includes(year) && normalized.includes(halfMarker);
    }) ?? null
  );
}

async function fetchSelangorNisab(): Promise<number> {
  const text = await fetchWithTimeout(SELANGOR_AJAX_URL);
  const parsed = JSON.parse(text) as { success?: boolean; data?: SelangorNisabEntry[] };
  if (!parsed.success || !Array.isArray(parsed.data)) {
    throw new Error("unexpected response shape from Selangor nisab feed");
  }

  const current = pickCurrentSelangorEntry(parsed.data, new Date());
  if (!current) throw new Error("no entry found for the current half-year period");

  const amount = Number(current.jumlah.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount)) throw new Error(`couldn't parse amount from "${current.jumlah}"`);

  return amount;
}

export const STATE_AUTHORITIES: StateAuthorityConfig[] = [
  {
    state: "selangor",
    authorityName: "Lembaga Zakat Selangor (LZS)",
    url: SELANGOR_AJAX_URL,
    anchorText: "",
    fetchOverride: fetchSelangorNisab,
  },
  {
    state: "wp_kl_putrajaya_labuan",
    authorityName: "Pusat Pungutan Zakat–MAIWP (PPZ-MAIWP)",
    url: "https://www.zakat.com.my/info-zakat/jenis-jenis-zakat/zakat-pendapatan/",
    anchorText: "nisab 2026",
  },
  {
    state: "johor",
    authorityName: "Majlis Agama Islam Negeri Johor (MAIJ)",
    url: "https://www.maij.gov.my/?page_id=110",
    anchorText: "kadar nisab zakat semasa terkini",
  },
  {
    state: "kedah",
    authorityName: "Lembaga Zakat Negeri Kedah (LZNK)",
    url: "https://www.lznk.com.my/",
    anchorText: "nisab taqdiri (emas)",
  },
  {
    state: "melaka",
    authorityName: "Majlis Agama Islam Melaka (MAIM)",
    url: "https://www2.izakat.com/ui.php",
    anchorText: "nisab semasa",
  },
  {
    state: "negeri_sembilan",
    authorityName: "Majlis Agama Islam Negeri Sembilan (MAINS)",
    url: "https://portal.mains.gov.my/",
    anchorText: "nisab semasa zakat harta",
  },
  {
    state: "sabah",
    authorityName: "Pusat Zakat Sabah",
    url: "http://appszakat.sabah.gov.my/zakat/",
    anchorText: "nisab semasa",
  },
  {
    state: "terengganu",
    authorityName: "Majlis Agama Islam dan Adat Istiadat Melayu Terengganu (MAIDAM)",
    url: "https://ezakat.maidam.gov.my/online/nisab.php",
    anchorText: "tahun taksiran",
  },
];

const AMOUNT_PATTERN = /rm\s*([\d,]+(?:\.\d+)?)/i;
const SEARCH_WINDOW = 400;

function normalizeHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Pure parser: finds `anchorText` in the page and reads the nearest RM amount after it. Returns null rather than throwing so a single missed anchor doesn't take down a whole sync pass. */
export function parseNisabAmount(html: string, anchorText: string): number | null {
  const text = normalizeHtml(html);
  const anchorIndex = text.indexOf(anchorText.toLowerCase());
  if (anchorIndex === -1) return null;

  const window = text.slice(anchorIndex, anchorIndex + anchorText.length + SEARCH_WINDOW);
  const match = window.match(AMOUNT_PATTERN);
  if (!match) return null;

  return Number(match[1].replace(/,/g, ""));
}

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`request failed with status ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

interface StateRateRow {
  state_key: string;
  nisab_rm: number | null;
  source_url: string | null;
  last_checked_at: string;
  last_error: string | null;
}

export async function getStateNisab(state: MalaysiaStateKey): Promise<StateNisabRate | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<StateRateRow>(
    "SELECT state_key, nisab_rm, source_url, last_checked_at, last_error FROM nisab_state_rates WHERE state_key = ?",
    state,
  );
  if (!row || row.nisab_rm === null || row.source_url === null) return null;

  return {
    state: row.state_key as MalaysiaStateKey,
    nisabRM: row.nisab_rm,
    sourceUrl: row.source_url,
    lastCheckedAt: row.last_checked_at,
    lastError: row.last_error,
  };
}

export async function getAllStateNisabRates(): Promise<StateNisabRate[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<StateRateRow>(
    "SELECT state_key, nisab_rm, source_url, last_checked_at, last_error FROM nisab_state_rates",
  );
  return rows
    .filter((r) => r.nisab_rm !== null && r.source_url !== null)
    .map((r) => ({
      state: r.state_key as MalaysiaStateKey,
      nisabRM: r.nisab_rm as number,
      sourceUrl: r.source_url as string,
      lastCheckedAt: r.last_checked_at,
      lastError: r.last_error,
    }));
}

async function recordSuccess(state: MalaysiaStateKey, nisabRM: number, sourceUrl: string, checkedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO nisab_state_rates (state_key, nisab_rm, source_url, last_checked_at, last_error, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?)
     ON CONFLICT(state_key) DO UPDATE SET
       nisab_rm = excluded.nisab_rm,
       source_url = excluded.source_url,
       last_checked_at = excluded.last_checked_at,
       last_error = NULL,
       updated_at = excluded.updated_at`,
    state,
    nisabRM,
    sourceUrl,
    checkedAt,
    checkedAt,
  );
}

/** Records a failed check without touching nisab_rm/source_url — those keep reflecting the last check that actually succeeded, same rationale as lhdn-relief-sync-service's recordFailedCheck. */
async function recordFailure(state: MalaysiaStateKey, error: string, checkedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO nisab_state_rates (state_key, last_checked_at, last_error, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(state_key) DO UPDATE SET
       last_checked_at = excluded.last_checked_at,
       last_error = excluded.last_error,
       updated_at = excluded.updated_at`,
    state,
    checkedAt,
    error,
    checkedAt,
  );
}

/** Fetches + parses one jurisdiction's live page and persists the outcome (new rate, or an error that leaves the prior cached rate untouched). */
export async function syncOneState(config: StateAuthorityConfig): Promise<void> {
  const checkedAt = new Date().toISOString();
  try {
    let amount: number | null;
    if (config.fetchOverride) {
      amount = await config.fetchOverride();
    } else {
      const html = await fetchWithTimeout(config.url);
      amount = parseNisabAmount(html, config.anchorText);
    }

    if (amount === null) {
      await recordFailure(config.state, "anchor text not found on page", checkedAt);
      return;
    }
    await recordSuccess(config.state, amount, config.url, checkedAt);
  } catch (err: any) {
    await recordFailure(config.state, err?.message ?? "Unknown error", checkedAt);
  }
}

/** Runs every configured jurisdiction independently — one site being down or restructured never blocks the others. */
export async function syncAllStates(): Promise<void> {
  await Promise.all(STATE_AUTHORITIES.map((config) => syncOneState(config)));

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO nisab_state_sync_state (id, last_synced_at) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET last_synced_at = excluded.last_synced_at`,
    new Date().toISOString(),
  );
}

// State nisab pages change far less often than LHDN's annual Budget-driven
// reliefs, but scraping ~14 heterogeneous sites is more failure-prone, so a
// shorter interval means a broken anchor gets noticed (via last_error) sooner.
export const STATE_SYNC_INTERVAL_DAYS = 30;

export async function shouldRunScheduledStateSync(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ last_synced_at: string | null }>(
    "SELECT last_synced_at FROM nisab_state_sync_state WHERE id = 1",
  );
  if (!row?.last_synced_at) return true;
  const elapsedDays = (Date.now() - new Date(row.last_synced_at).getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays >= STATE_SYNC_INTERVAL_DAYS;
}
