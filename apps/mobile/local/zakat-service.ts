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
 * Nisab only has to be held at the start of a cycle and again at each
 * annual checkpoint (haulStart + N hijri years) — a dip in between is
 * ignored, per the "start & end only" majority position (confirmed against
 * two independent sources, see zakat-haul-nisab-question.md history). The
 * anchor date itself never moves except when the user records a payment
 * (see upsertTracker); it is not reset just because nisab was briefly
 * unmet.
 *
 * If a checkpoint is reached without nisab held, that year's zakat is
 * skipped and we roll forward to the next annual checkpoint on the same
 * anchor — we don't have historical nisab snapshots, so the checkpoint
 * closest to "now" is evaluated using the current nisabReached as a stand-in
 * for its value on that date.
 *
 * When there's no recorded haul start yet, a new cycle anchors to
 * lastPaidDate (the last time zakat was actually paid) rather than "now" —
 * "now" is only used as a last resort when zakat has never been paid for
 * this category either.
 */
export function computeHaulStatus(
  haulStart: Date | null,
  lastPaidDate: Date | null,
  nisabReached: boolean,
  now: Date,
): HaulResult {
  if (!haulStart) {
    if (!nisabReached) {
      return { status: "PENDING", nextDue: null, newHaulStart: null };
    }
    const start = lastPaidDate ?? now;
    return statusFromDue(start, addHijriYear(start), now);
  }

  let due = addHijriYear(haulStart);
  while (due.getTime() <= now.getTime() && !nisabReached) {
    due = addHijriYear(due);
  }
  return statusFromDue(haulStart, due, now);
}

function statusFromDue(start: Date, due: Date, now: Date): HaulResult {
  const hours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  const daysUntilDue = Math.trunc(hours / 24);

  if (daysUntilDue <= 0) {
    return { status: "OVERDUE", nextDue: due, newHaulStart: start };
  }
  if (daysUntilDue <= DUE_WINDOW_DAYS) {
    return { status: "DUE", nextDue: due, newHaulStart: start };
  }
  return { status: "PENDING", nextDue: due, newHaulStart: start };
}

// Every category is tracked unconditionally — there's no opt-out, so all
// tracker rows are relevant regardless of their (now-vestigial) status column.
async function getAllTrackers(): Promise<ZakatTrackerRow[]> {
  const db = await getDb();
  return db.getAllAsync<ZakatTrackerRow>("SELECT * FROM zakat_tracker");
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

  const now = new Date();
  const { nisabRM: currentNisab, source: nisabSource } = await resolveNisab();
  const dtos: ZakatTrackerDto[] = [];

  for (const [category, agg] of categories) {
    const value = agg.value;
    // Null (not false!) when nisab itself is unavailable — treating unknown
    // as "not reached" would be actively wrong here, since an outage in the
    // nisab source must never look like the user's holdings actually
    // dropped below nisab (see the nisabReached === null branch below).
    const nisabReached = currentNisab === null ? null : value >= currentNisab;
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
      is_tracked: true,
      haul_status: "UNKNOWN",
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
      dto.haul_start_date = tracker.haul_start_date;

      if (nisabReached === null) {
        // Nisab is unavailable right now — never write to the tracker in
        // this branch (no reset, no haul-start update). We can't
        // responsibly assess whether nisab is still held, so the existing
        // stored cycle is left exactly as-is and only surfaced as
        // informational (next_due_date, if a cycle was already in
        // progress) rather than asserting a real PENDING/DUE/OVERDUE status.
        dto.haul_status = "UNKNOWN";
        if (haulStart) {
          const due = addHijriYear(haulStart);
          dto.next_due_date = due.toISOString();
          dto.next_due_date_hijri = await formatHijri(due);
        }
      } else {
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

        if (haulStart === null && newHaulStart !== null) {
          await updateHaulStartDate(category, newHaulStart);
        }
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
