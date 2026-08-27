import { getDb } from "./db";

// Ported from apps/backend/pkg/hijri (Go) — keep in sync if that changes.

const MONTH_NAMES = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Akhir",
  "Jumada al-Awwal",
  "Jumada al-Akhir",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** UTC "YYYY-MM-DD" key, matching Go's `t.Format("2006-01-02")` on a UTC time. */
function dateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function todayKey(): string {
  return dateKey(new Date());
}

// --- Julian day <-> Gregorian (Fliegel & Van Flandern), operating on the
// UTC calendar date only (no time-of-day). ---

function toJulianDay(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045
  );
}

function julianDayToDate(jd: number): Date {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Tabular civil Islamic calendar (Kuwaiti algorithm) — an arithmetic
 * approximation, not moon-sighting-based, so it can land a day or two off
 * Malaysia's official calendar. Used only when JAKIM's API is unreachable.
 * Verified against a known anchor: 1 Muharram 1447H = 27 June 2025.
 */
export function estimate(d: Date): { year: number; month: number; day: number } {
  const jd = toJulianDay(d);
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

/**
 * Returns the Gregorian date one Hijri year after `d` — same Hijri day and
 * month, year+1 — rather than a fixed +354/+355 day offset, since Hijri
 * years vary in length. Always uses the arithmetic estimate (not the live
 * JAKIM lookup), since it's projecting into the future.
 */
export function addHijriYear(d: Date): Date {
  const { year, month, day } = estimate(d);
  const targetY = year + 1;
  const targetM = month;
  const targetD = day;

  let jd = toJulianDay(d) + 354;
  for (let i = 0; i < 5; i++) {
    const cur = estimate(julianDayToDate(jd));
    if (cur.year === targetY && cur.month === targetM && cur.day === targetD) {
      break;
    }
    if (
      cur.year < targetY ||
      (cur.year === targetY && cur.month < targetM) ||
      (cur.year === targetY && cur.month === targetM && cur.day < targetD)
    ) {
      jd++;
    } else {
      jd--;
    }
  }
  return julianDayToDate(jd);
}

function formatYMD(year: number, month: number, day: number): string {
  const name = month >= 1 && month <= 12 ? MONTH_NAMES[month - 1] : "?";
  return `${day} ${name} ${year}H`;
}

// --- JAKIM e-Solat live lookup, cached, with a circuit breaker ---

const JAKIM_ZONE = "WLY01";
const JAKIM_ENDPOINT = "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&zone=" + JAKIM_ZONE + "&period=duration";
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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromJakim(dateStr: string): Promise<string> {
  const body = new URLSearchParams({ datestart: dateStr, dateend: dateStr });
  const resp = await fetchWithTimeout(
    JAKIM_ENDPOINT,
    { method: "POST", body: body.toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    FETCH_TIMEOUT_MS,
  );
  if (!resp.ok) throw new Error(`jakim api returned status ${resp.status}`);

  const json = await resp.json();
  const hijri = json?.prayerTime?.[0]?.hijri;
  if (!hijri) throw new Error("jakim api returned no hijri date");
  return hijri as string;
}

function parseYMD(hijriDate: string): { year: number; month: number; day: number } | null {
  const parts = hijriDate.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  return { year: y, month: m, day: d };
}

async function cacheGet(gregorianDate: string): Promise<{ hijriDate: string; cachedOn: string } | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ hijri_date: string; cached_on: string }>(
    "SELECT hijri_date, cached_on FROM hijri_cache WHERE gregorian_date = ?",
    gregorianDate,
  );
  if (!row) return null;
  return { hijriDate: row.hijri_date, cachedOn: row.cached_on };
}

async function cacheSet(gregorianDate: string, hijriDate: string, cachedOn: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO hijri_cache (gregorian_date, hijri_date, cached_on) VALUES (?, ?, ?)",
    gregorianDate,
    hijriDate,
    cachedOn,
  );
}

/**
 * Returns JAKIM's Hijri date for `d`, from cache or a live fetch.
 *
 * A date already in the past when queried is sighting-confirmed and
 * permanent, so its cache entry is trusted forever. A date still upcoming is
 * only a JAKIM-published estimate and could still be revised, so it's only
 * trusted for the rest of the day it was fetched, and re-checked once per
 * day after that until the date itself has passed.
 */
async function lookup(d: Date): Promise<{ year: number; month: number; day: number } | null> {
  const key = dateKey(d);
  const today = todayKey();

  const cached = await cacheGet(key);
  const isSettled = key <= today;
  const isFreshEnough = !!cached && cached.cachedOn === today;

  if (cached && (isSettled || isFreshEnough)) {
    return parseYMD(cached.hijriDate);
  }

  if (breakerOpen()) {
    return cached ? parseYMD(cached.hijriDate) : null;
  }

  try {
    const fetched = await fetchFromJakim(key);
    recordSuccess();
    await cacheSet(key, fetched, today);
    return parseYMD(fetched);
  } catch {
    recordFailure();
    return cached ? parseYMD(cached.hijriDate) : null;
  }
}

/**
 * Renders a Gregorian date as a "D Month YYYYH" Hijri string, preferring
 * JAKIM's published date and falling back to the arithmetic estimate.
 */
export async function format(d: Date): Promise<string> {
  const looked = await lookup(d);
  if (looked) return formatYMD(looked.year, looked.month, looked.day);
  const est = estimate(d);
  return formatYMD(est.year, est.month, est.day);
}
