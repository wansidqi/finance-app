import {
  PlatformShare,
  UpdateZakatTrackerRequest,
  ZakatSettingsDto,
  ZakatTrackerDto,
} from "@/interface/zakat";
import { getAllAssets } from "./asset-service";
import { getDb } from "./db";
import { addHijriYear, format as formatHijri } from "./hijri";
import { value as nisabValue } from "./nisab";

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

async function updateHaulStartDate(category: string, haulStart: Date | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE zakat_tracker SET haul_start_date = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?",
    haulStart ? haulStart.toISOString() : null,
    category,
  );
}

/** Pseudo-category used to key the single combined tracker/aggregate when "combine categories" is on. */
export const COMBINED_CATEGORY = "ALL";

export async function getZakatSettings(): Promise<ZakatSettingsDto> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ combine_categories: number }>(
    "SELECT combine_categories FROM zakat_settings WHERE id = 1",
  );
  return { combine_categories: !!row?.combine_categories };
}

export async function setCombineCategories(combine: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO zakat_settings (id, combine_categories, updated_at)
     VALUES (1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       combine_categories = excluded.combine_categories,
       updated_at = CURRENT_TIMESTAMP`,
    combine ? 1 : 0,
  );
}

export async function getAllCategories(): Promise<ZakatTrackerDto[]> {
  const assets = await getAllAssets();
  const { combine_categories } = await getZakatSettings();

  const categories = new Map<string, CategoryTotal>();

  function addToAgg(agg: CategoryTotal, asset: (typeof assets)[number]) {
    const platform = asset.platform && asset.platform !== "" ? asset.platform : "Unspecified";
    agg.value += asset.price!;
    agg.platforms.set(platform, (agg.platforms.get(platform) ?? 0) + asset.price!);
  }

  if (combine_categories) {
    // Every eligible asset, across every category, folds into one bucket —
    // nisab and zakat are then computed once on the combined total.
    const agg: CategoryTotal = { value: 0, platforms: new Map() };
    for (const a of assets) {
      if (!a.is_calculate || a.price == null) continue;
      addToAgg(agg, a);
    }
    categories.set(COMBINED_CATEGORY, agg);
  } else {
    for (const a of assets) {
      if (!a.is_calculate || a.price == null) continue;

      let agg = categories.get(a.category);
      if (!agg) {
        agg = { value: 0, platforms: new Map() };
        categories.set(a.category, agg);
      }
      addToAgg(agg, a);
    }
  }

  const trackers = await getAllTrackers();
  const trackerMap = new Map(trackers.map((t) => [t.category, t]));

  const now = new Date();
  const currentNisab = await nisabValue();
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
      is_tracked: false,
      haul_status: "PENDING",
      nisab: currentNisab,
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
