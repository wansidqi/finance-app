import { TAX_RELIEF_CATEGORIES, TaxReliefCategoryKey } from "@/interface/tax-relief";
import { getCapsForYear, updateCap } from "./tax-relief-service";
import { getDb } from "./db";

export const LHDN_RELIEF_PAGE_URL = "https://www.hasil.gov.my/en/individu/pelepasan-cukai/";

// How often a scheduled check should run — LHDN revises reliefs roughly
// once a year (Budget), but the user wants a quarterly cadence, so a check
// that finds nothing changed most of the time is expected, not a bug.
export const SYNC_CHECK_INTERVAL_DAYS = 90;

export interface LhdnReliefDiff {
  category_key: TaxReliefCategoryKey;
  current_cap: number;
  scraped_amount: number;
}

export interface LhdnSyncResult {
  checked_at: string;
  diffs: LhdnReliefDiff[];
  // Categories the scraper couldn't confidently locate on the page this
  // time — surfaced so a structure change on LHDN's end is visible rather
  // than silently treated as "no change".
  unmatched: TaxReliefCategoryKey[];
}

interface SyncStateRow {
  last_checked_at: string | null;
  pending_diffs: string | null;
  last_unmatched: string | null;
  last_error: string | null;
}

// Anchor phrases unique to each relief's row on hasil.gov.my/en/individu/pelepasan-cukai/,
// verified against the Year of Assessment 2025 listing. LHDN has kept this page's wording
// stable since at least 2016, but a future redesign could still break these — that's what
// `unmatched` in LhdnSyncResult surfaces.
const CATEGORY_ANCHORS: Record<TaxReliefCategoryKey, string> = {
  lifestyle: "purchase or subscription of books",
  lifestyle_sports: "purchase of sports equipment",
  medical_self_spouse_child: "serious diseases for self, spouse or child",
  medical_parents: "parents and grandparents",
  education_fees: "education fees (self)",
  life_insurance_epf: "life insurance and epf",
  prs: "private retirement scheme",
  sspn: "skim simpanan pendidikan nasional",
  disabled_equipment: "basic supporting equipment for disabled",
  breastfeeding_equipment: "purchase of breastfeeding equipment",
  childcare: "child care fees to a registered child care centre",
  ev_charging: "charging facilities for electric vehicle",
};

// Requires a thousands-separator comma so enumeration markers like "1." or
// "2." inside a relief's description never get mistaken for its amount —
// every current relief amount is >= RM1,000, so this never under-matches.
const AMOUNT_PATTERN = /\b(\d{1,3}(?:,\d{3})+)\b/;
const SEARCH_WINDOW = 600;

function normalizeHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Pure parser: extracts whatever relief amounts it can confidently find. Categories it can't locate are simply absent from the result. */
export function parseReliefAmounts(html: string): Partial<Record<TaxReliefCategoryKey, number>> {
  const text = normalizeHtml(html);
  const result: Partial<Record<TaxReliefCategoryKey, number>> = {};

  for (const key of TAX_RELIEF_CATEGORIES) {
    const anchor = CATEGORY_ANCHORS[key];
    const anchorIndex = text.indexOf(anchor);
    if (anchorIndex === -1) continue;

    const window = text.slice(anchorIndex, anchorIndex + anchor.length + SEARCH_WINDOW);
    const match = window.match(AMOUNT_PATTERN);
    if (!match) continue;

    result[key] = Number(match[1].replace(/,/g, ""));
  }

  return result;
}

async function fetchReliefPageHtml(): Promise<string> {
  const response = await fetch(LHDN_RELIEF_PAGE_URL);
  if (!response.ok) {
    throw new Error(`LHDN relief page request failed with status ${response.status}`);
  }
  return response.text();
}

/** Fetches + parses the live page and diffs it against this year's stored caps. Never writes caps itself — callers decide whether/what to apply. */
export async function checkForUpdates(year: number): Promise<LhdnSyncResult> {
  const html = await fetchReliefPageHtml();
  const scraped = parseReliefAmounts(html);
  const currentCaps = await getCapsForYear(year);
  const capByCategory = new Map(currentCaps.map((c) => [c.category_key, c.cap_amount]));

  const diffs: LhdnReliefDiff[] = [];
  const unmatched: TaxReliefCategoryKey[] = [];

  for (const key of TAX_RELIEF_CATEGORIES) {
    const scrapedAmount = scraped[key];
    if (scrapedAmount === undefined) {
      unmatched.push(key);
      continue;
    }
    const currentCap = capByCategory.get(key) ?? 0;
    if (scrapedAmount !== currentCap) {
      diffs.push({ category_key: key, current_cap: currentCap, scraped_amount: scrapedAmount });
    }
  }

  return { checked_at: new Date().toISOString(), diffs, unmatched };
}

export async function getSyncState(): Promise<{
  lastCheckedAt: string | null;
  pendingDiffs: LhdnReliefDiff[];
  // From the most recent *successful* check — a failed check (network error,
  // etc.) leaves this untouched rather than clearing it, so a transient
  // failure can never masquerade as "everything matched".
  unmatched: TaxReliefCategoryKey[];
  lastError: string | null;
}> {
  const db = await getDb();
  const row = await db.getFirstAsync<SyncStateRow>(
    "SELECT last_checked_at, pending_diffs, last_unmatched, last_error FROM lhdn_sync_state WHERE id = 1",
  );
  return {
    lastCheckedAt: row?.last_checked_at ?? null,
    pendingDiffs: row?.pending_diffs ? JSON.parse(row.pending_diffs) : [],
    unmatched: row?.last_unmatched ? JSON.parse(row.last_unmatched) : [],
    lastError: row?.last_error ?? null,
  };
}

export async function shouldRunScheduledCheck(): Promise<boolean> {
  const { lastCheckedAt } = await getSyncState();
  if (!lastCheckedAt) return true;
  const elapsedDays = (Date.now() - new Date(lastCheckedAt).getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays >= SYNC_CHECK_INTERVAL_DAYS;
}

async function recordSuccessfulCheck(result: LhdnSyncResult): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO lhdn_sync_state (id, last_checked_at, pending_diffs, last_unmatched, last_error)
     VALUES (1, ?, ?, ?, NULL)
     ON CONFLICT(id) DO UPDATE SET
       last_checked_at = excluded.last_checked_at,
       pending_diffs = excluded.pending_diffs,
       last_unmatched = excluded.last_unmatched,
       last_error = NULL`,
    result.checked_at,
    JSON.stringify(result.diffs),
    JSON.stringify(result.unmatched),
  );
}

/** Records a failed check attempt without touching pending_diffs/last_unmatched — those still reflect the last check that actually completed. */
async function recordFailedCheck(checkedAt: string, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO lhdn_sync_state (id, last_checked_at, last_error)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_checked_at = excluded.last_checked_at,
       last_error = excluded.last_error`,
    checkedAt,
    error,
  );
}

/** Runs a live check against the given year and persists the outcome (diffs/unmatched, or an error) so the UI can surface it even across app restarts. */
export async function runAndRecordSyncCheck(year: number): Promise<LhdnSyncResult> {
  try {
    const result = await checkForUpdates(year);
    await recordSuccessfulCheck(result);
    return result;
  } catch (err: any) {
    const checkedAt = new Date().toISOString();
    await recordFailedCheck(checkedAt, err?.message ?? "Unknown error");
    return { checked_at: checkedAt, diffs: [], unmatched: [] };
  }
}

/** Applies a chosen subset of pending diffs as the new caps for `year`, then clears them from the pending list. */
export async function applySyncDiffs(year: number, categoryKeys: TaxReliefCategoryKey[]): Promise<void> {
  const { pendingDiffs } = await getSyncState();

  const toApply = pendingDiffs.filter((d) => categoryKeys.includes(d.category_key));
  for (const diff of toApply) {
    await updateCap(year, diff.category_key, diff.scraped_amount);
  }

  const remaining = pendingDiffs.filter((d) => !categoryKeys.includes(d.category_key));
  const db = await getDb();
  await db.runAsync("UPDATE lhdn_sync_state SET pending_diffs = ? WHERE id = 1", JSON.stringify(remaining));
}

export async function dismissPendingDiffs(): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE lhdn_sync_state SET pending_diffs = ? WHERE id = 1", JSON.stringify([]));
}
