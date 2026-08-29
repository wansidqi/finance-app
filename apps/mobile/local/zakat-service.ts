import { PlatformShare, UpdateZakatTrackerRequest, ZakatTrackerDto } from "@/interface/zakat";
import { getAllAssets } from "./asset-service";
import { getDb } from "./db";
import { addHijriYear, format as formatHijri } from "./hijri";
import { resolveNisab } from "./nisab-resolver";

// Ported from apps/backend/internal/zakat (Go) — keep in sync if that changes.

const ZAKAT_RATE = 0.025;

/** How many days before the haul completes that status switches from PENDING to DUE. */
export const DUE_WINDOW_DAYS = 7;

interface ZakatTrackerRow {
  id: number;
  user_id: number | null;
  category: string;
  last_paid_date: string | null;
  haul_start_date: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

function parseDate(s: string | null): Date | null {
  return s ? new Date(s) : null;
}

interface CategoryTotal {
  value: number;
  platforms: Map<string, number>;
}

export interface HaulResult {
  status: "PENDING" | "DUE" | "OVERDUE";
  nextDue: Date | null;
  newHaulStart: Date | null;
}

/**
 * Derives the haul (zakat year) status from the category's current haul
 * start date and whether nisab is currently held.
 *
 * Per fiqh, the haul only needs nisab to be held at the start and end of the
 * year, not continuously throughout — so a mid-cycle dip below nisab does
 * not reset haulStart. It's only reset (set back to null) once the cycle
 * completes (one Hijri year elapsed) while nisab is not held at that point.
 *
 * When there's no recorded haul start yet, it anchors to lastPaidDate (the
 * last time zakat was actually paid, which starts a fresh cycle) rather
 * than "now" — "now" is only used as a last resort when zakat has never
 * been paid for this category either.
 */
export function computeHaulStatus(
  haulStart: Date | null,
  lastPaidDate: Date | null,
  nisabReached: boolean,
  now: Date,
): HaulResult {
  let start = haulStart;
  if (start === null) {
    if (!nisabReached) {
      return { status: "PENDING", nextDue: null, newHaulStart: null };
    }
    start = lastPaidDate !== null ? lastPaidDate : now;
  }

  const due = addHijriYear(start);
  const hours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  const daysUntilDue = Math.trunc(hours / 24);

  if (daysUntilDue <= 0) {
    if (!nisabReached) {
      return { status: "PENDING", nextDue: null, newHaulStart: null };
    }
    return { status: "OVERDUE", nextDue: due, newHaulStart: start };
  }
  if (daysUntilDue <= DUE_WINDOW_DAYS) {
    return { status: "DUE", nextDue: due, newHaulStart: start };
  }
  return { status: "PENDING", nextDue: due, newHaulStart: start };
}

async function getAllTrackers(): Promise<ZakatTrackerRow[]> {
  const db = await getDb();
  return db.getAllAsync<ZakatTrackerRow>("SELECT * FROM zakat_tracker WHERE status = 'ACTIVE'");
}

/** Categories that already have a tracker row, active or not — used to tell a brand-new category (never seen) from one the user explicitly untracked. */
async function getKnownCategoryNames(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string }>("SELECT category FROM zakat_tracker");
  return new Set(rows.map((r) => r.category));
}

async function updateHaulStartDate(category: string, haulStart: Date | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE zakat_tracker SET haul_start_date = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?",
    haulStart ? haulStart.toISOString() : null,
    category,
  );
}

export async function getAllCategories(): Promise<ZakatTrackerDto[]> {
  const assets = await getAllAssets();

  const categories = new Map<string, CategoryTotal>();
  for (const a of assets) {
    if (!a.is_calculate || a.price == null) continue;

    let agg = categories.get(a.category);
    if (!agg) {
      agg = { value: 0, platforms: new Map() };
      categories.set(a.category, agg);
    }

    const platform = a.platform && a.platform !== "" ? a.platform : "Unspecified";
    agg.value += a.price;
    agg.platforms.set(platform, (agg.platforms.get(platform) ?? 0) + a.price);
  }

  const trackers = await getAllTrackers();
  const trackerMap = new Map(trackers.map((t) => [t.category, t]));
  const knownCategories = await getKnownCategoryNames();

  const now = new Date();
  const { nisabRM: currentNisab, source: nisabSource } = await resolveNisab();
  const dtos: ZakatTrackerDto[] = [];

  for (const [category, agg] of categories) {
    const value = agg.value;
    const nisabReached = value >= currentNisab;
    const zakatDue = nisabReached ? value * ZAKAT_RATE : 0;

    const platformBreakdown: PlatformShare[] = [];
    for (const [platform, platformValue] of agg.platforms) {
      const platformDue = nisabReached && value > 0 ? (platformValue / value) * zakatDue : 0;
      platformBreakdown.push({ platform, value: platformValue, zakat_due: platformDue });
    }

    const dto: ZakatTrackerDto = {
      id: null,
      user_id: null,
      category,
      value,
      status: null,
      created_at: null,
      updated_at: null,
      // A category with no tracker row at all is one we've never seen before — default it to tracked.
      is_tracked: !knownCategories.has(category),
      haul_status: "PENDING",
      nisab: currentNisab,
      nisab_source: nisabSource,
      nisab_reached: nisabReached,
      last_paid_date: null,
      last_paid_date_hijri: null,
      haul_start_date: null,
      next_due_date: null,
      next_due_date_hijri: null,
      zakat_due: zakatDue,
      platform_breakdown: platformBreakdown,
    };

    const tracker = trackerMap.get(category);
    if (tracker) {
      dto.is_tracked = true;
      dto.id = tracker.id;
      dto.user_id = tracker.user_id;
      dto.status = tracker.status as ZakatTrackerDto["status"];
      dto.created_at = tracker.created_at;
      dto.updated_at = tracker.updated_at;

      const lastPaidDate = parseDate(tracker.last_paid_date);
      dto.last_paid_date = tracker.last_paid_date;
      if (lastPaidDate) {
        dto.last_paid_date_hijri = await formatHijri(lastPaidDate);
      }

      const haulStart = parseDate(tracker.haul_start_date);
      const { status, nextDue, newHaulStart } = computeHaulStatus(
        haulStart,
        lastPaidDate,
        nisabReached,
        now,
      );
      dto.haul_status = status;
      dto.next_due_date = nextDue ? nextDue.toISOString() : null;
      dto.haul_start_date = newHaulStart ? newHaulStart.toISOString() : null;
      if (nextDue) {
        dto.next_due_date_hijri = await formatHijri(nextDue);
      }

      if ((haulStart === null) !== (newHaulStart === null)) {
        await updateHaulStartDate(category, newHaulStart);
      }
    }

    dtos.push(dto);
  }

  return dtos;
}

export async function upsertTracker(req: UpdateZakatTrackerRequest): Promise<void> {
  const category = req.category.toUpperCase();
  const lastPaidDate = req.last_paid_date ?? null;
  const haulStart = lastPaidDate;

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO zakat_tracker (user_id, category, last_paid_date, haul_start_date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(category) DO UPDATE SET
       last_paid_date = COALESCE(excluded.last_paid_date, zakat_tracker.last_paid_date),
       haul_start_date = COALESCE(excluded.haul_start_date, zakat_tracker.haul_start_date),
       status = excluded.status,
       updated_at = CURRENT_TIMESTAMP`,
    null,
    category,
    lastPaidDate,
    haulStart,
    req.status,
  );
}
