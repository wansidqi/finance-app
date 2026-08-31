export type MalaysiaStateKey =
  | "selangor"
  | "wp_kl_putrajaya_labuan"
  | "johor"
  | "kedah"
  | "kelantan"
  | "melaka"
  | "negeri_sembilan"
  | "pahang"
  | "perak"
  | "perlis"
  | "pulau_pinang"
  | "sabah"
  | "sarawak"
  | "terengganu";

export const MALAYSIA_STATE_LABELS: Record<MalaysiaStateKey, string> = {
  selangor: "Selangor",
  wp_kl_putrajaya_labuan: "Wilayah Persekutuan (KL, Putrajaya, Labuan)",
  johor: "Johor",
  kedah: "Kedah",
  kelantan: "Kelantan",
  melaka: "Melaka",
  negeri_sembilan: "Negeri Sembilan",
  pahang: "Pahang",
  perak: "Perak",
  perlis: "Perlis",
  pulau_pinang: "Pulau Pinang",
  sabah: "Sabah",
  sarawak: "Sarawak",
  terengganu: "Terengganu",
};

export const MALAYSIA_STATES: MalaysiaStateKey[] = [
  "selangor",
  "wp_kl_putrajaya_labuan",
  "johor",
  "kedah",
  "kelantan",
  "melaka",
  "negeri_sembilan",
  "pahang",
  "perak",
  "perlis",
  "pulau_pinang",
  "sabah",
  "sarawak",
  "terengganu",
];

/**
 * Where a resolved nisab figure came from — surfaced in the UI so the user
 * knows why the number is what it is. `ppz_fallback` is distinct from
 * `state`: it's PPZ-MAIWP's (Kuala Lumpur/Putrajaya/Labuan) published rate
 * used as a *generic* stand-in for a user whose own state has no live
 * source configured — not the user's own detected jurisdiction.
 *
 * `unavailable` means no real source (state, AI-with-citation, or PPZ) had
 * a figure — by design there's no further computed fallback (e.g. a
 * nationwide gold-price nisab) standing in for one, since presenting a
 * generic computed number as if it were an official rate was judged more
 * confusing than just saying nisab isn't available right now.
 */
export type NisabSource =
  | { kind: "state"; state: MalaysiaStateKey; sourceUrl: string | null; asOf: string }
  | { kind: "ai_fallback"; state: MalaysiaStateKey; asOf: string }
  | { kind: "ppz_fallback"; sourceUrl: string | null; asOf: string }
  | { kind: "unavailable" };

export interface StateNisabRate {
  state: MalaysiaStateKey;
  nisabRM: number;
  /** The zakat authority name this figure is attributed to — from apps/backend, scraped or AI-sourced. */
  zakatAgency: string;
  /** Customary worn-jewelry exemption threshold in grams (zakat uruf), when the source publishes one. */
  goldUrufWornGrams: number | null;
  sourceUrl: string | null;
  /** True when apps/backend got this from a live scrape of the state's own site; false when it's the Gemini AI fallback. */
  isScraped: boolean;
  asOf: string;
}

export type LocationDetectionMethod = "gps" | "unavailable";

export interface DetectedLocation {
  state: MalaysiaStateKey | null;
  method: LocationDetectionMethod;
  detectedAt: string;
  rawRegion: string | null;
}
