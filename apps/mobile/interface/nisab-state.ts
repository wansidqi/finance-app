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
 */
export type NisabSource =
  | { kind: "state"; state: MalaysiaStateKey; sourceUrl: string; asOf: string }
  | { kind: "ppz_fallback"; sourceUrl: string; asOf: string }
  | { kind: "gold_price" };

export interface StateNisabRate {
  state: MalaysiaStateKey;
  nisabRM: number;
  sourceUrl: string;
  lastCheckedAt: string;
  lastError: string | null;
}

export type LocationDetectionMethod = "gps" | "unavailable";

export interface DetectedLocation {
  state: MalaysiaStateKey | null;
  method: LocationDetectionMethod;
  detectedAt: string;
  rawRegion: string | null;
}
