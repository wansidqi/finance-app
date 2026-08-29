import { DetectedLocation, MALAYSIA_STATES, MalaysiaStateKey } from "@/interface/nisab-state";
import * as Location from "expo-location";
import { getDb } from "./db";

/**
 * Aliases seen in reverse-geocode results across iOS (Apple) and Android
 * (Google) geocoders, which format Malaysian state/region names differently
 * (e.g. "Wilayah Persekutuan Kuala Lumpur" vs "Kuala Lumpur" vs "W.P. Kuala
 * Lumpur"). Matching is substring-based against a normalized region string,
 * so any of these appearing anywhere in the geocoder's output resolves to
 * the state.
 */
const STATE_ALIASES: Record<MalaysiaStateKey, string[]> = {
  selangor: ["selangor"],
  wp_kl_putrajaya_labuan: ["kuala lumpur", "putrajaya", "labuan"],
  johor: ["johor"],
  kedah: ["kedah"],
  kelantan: ["kelantan"],
  melaka: ["melaka", "malacca"],
  negeri_sembilan: ["negeri sembilan"],
  pahang: ["pahang"],
  perak: ["perak"],
  perlis: ["perlis"],
  pulau_pinang: ["pulau pinang", "penang"],
  sabah: ["sabah"],
  sarawak: ["sarawak"],
  terengganu: ["terengganu"],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
}

/** Pure matcher: maps a free-text region/subregion string from a geocoder to one of our state keys, or null if none match. */
export function matchState(regionText: string | null | undefined): MalaysiaStateKey | null {
  if (!regionText) return null;
  const text = normalize(regionText);

  for (const state of MALAYSIA_STATES) {
    if (STATE_ALIASES[state].some((alias) => text.includes(alias))) {
      return state;
    }
  }
  return null;
}

interface LocationRow {
  state_key: string | null;
  method: string | null;
  raw_region: string | null;
  detected_at: string | null;
}

export async function getStoredLocation(): Promise<DetectedLocation | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LocationRow>(
    "SELECT state_key, method, raw_region, detected_at FROM user_location WHERE id = 1",
  );
  if (!row || !row.detected_at) return null;
  return {
    state: (row.state_key as MalaysiaStateKey | null) ?? null,
    method: (row.method as DetectedLocation["method"]) ?? "unavailable",
    rawRegion: row.raw_region,
    detectedAt: row.detected_at,
  };
}

async function storeLocation(result: DetectedLocation): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO user_location (id, state_key, method, raw_region, detected_at)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       state_key = excluded.state_key,
       method = excluded.method,
       raw_region = excluded.raw_region,
       detected_at = excluded.detected_at`,
    result.state,
    result.method,
    result.rawRegion,
    result.detectedAt,
  );
}

/**
 * Requests foreground location permission (prompting the user if not yet
 * asked), reads the device's current position, and reverse-geocodes it to a
 * Malaysian state. Persists whatever it finds — including a failed attempt
 * — so callers always have a `DetectedLocation` to read via
 * `getStoredLocation()` rather than needing to redo this each time.
 */
export async function detectAndStoreLocation(): Promise<DetectedLocation> {
  const detectedAt = new Date().toISOString();

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      const result: DetectedLocation = { state: null, method: "unavailable", rawRegion: null, detectedAt };
      await storeLocation(result);
      return result;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    const [place] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    const rawRegion = [place?.region, place?.subregion].filter(Boolean).join(", ") || null;
    const state = matchState(place?.region) ?? matchState(place?.subregion);

    const result: DetectedLocation = { state, method: "gps", rawRegion, detectedAt };
    await storeLocation(result);
    return result;
  } catch {
    const result: DetectedLocation = { state: null, method: "unavailable", rawRegion: null, detectedAt };
    await storeLocation(result);
    return result;
  }
}
