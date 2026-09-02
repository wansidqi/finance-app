// Hand-collected seed data for all 14 jurisdictions, used purely as a local,
// on-device fallback when the backend's `/api/zakat/nisab-states` returns
// nothing for a state — no backend has ever been reachable, it's cold, or a
// refresh only partially succeeded. A backend-provided value always wins;
// this only fills gaps. Collected manually 2026-08-31; treat as a snapshot,
// not a live source — see SCRAPING.md for what page each figure came from
// and where a real per-state scraper could eventually replace it.
import { MalaysiaStateKey, StateNisabRate } from "@/interface/nisab-state";

type StaticEntry = Omit<StateNisabRate, "isScraped">;

// isScraped is derived from sourceUrl below rather than set per-entry: it
// means "has a real attributed source" (see nisab-resolver.ts), which for
// this hand-collected list is exactly "a source page was found for it" —
// true for every state here except Perlis and Sarawak, where no confirmed
// page was located (see SCRAPING.md).
const RAW_ENTRIES: StaticEntry[] = [
  {
    state: "selangor",
    zakatAgency: "Lembaga Zakat Selangor (LZS)",
    nisabRM: 38748.0,
    goldUrufWornGrams: null,
    sourceUrl: "https://www.zakatselangor.com.my/",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "wp_kl_putrajaya_labuan",
    zakatAgency: "Pusat Pungutan Zakat (PPZ-MAIWP)",
    nisabRM: 33996.0,
    goldUrufWornGrams: null,
    sourceUrl: "https://zakat2u.com.my/",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "johor",
    zakatAgency: "Majlis Agama Islam Johor (MAIJ)",
    nisabRM: 45825.48,
    goldUrufWornGrams: null,
    sourceUrl: "https://www.maij.gov.my/",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "kedah",
    zakatAgency: "Lembaga Zakat Negeri Kedah (LZNK)",
    nisabRM: 32871.27,
    goldUrufWornGrams: null,
    sourceUrl: "https://www.lznk.com.my/",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "kelantan",
    zakatAgency: "Majlis Agama Islam dan Adat Istiadat Melayu Kelantan (MAIK)",
    nisabRM: 37401.0,
    goldUrufWornGrams: null,
    sourceUrl: "https://zakat.e-maik.my/v8/kalkulator/zakat_pendapatan.php",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "melaka",
    zakatAgency: "Pusat Zakat Melaka",
    nisabRM: 40092.42,
    goldUrufWornGrams: null,
    sourceUrl: "https://www.izakat.com/nisab_dashboard.php",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "negeri_sembilan",
    zakatAgency: "Majlis Agama Islam Negeri Sembilan (MAINS)",
    nisabRM: 33880.36,
    goldUrufWornGrams: null,
    sourceUrl: "https://portal.mains.gov.my/",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "pahang",
    zakatAgency: "Zakat Pahang",
    nisabRM: 40092.42,
    goldUrufWornGrams: null,
    sourceUrl: "https://zakatpahang.my/arkib-nisab/",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "perak",
    zakatAgency: "Majlis Agama Islam dan Adat Melayu Perak (MAIPk / ZAPAR)",
    nisabRM: 46954.31,
    goldUrufWornGrams: null,
    sourceUrl: "https://zapar.com.my/index.php/nisab",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    // No source URL located yet — see SCRAPING.md's Perlis entry before
    // trusting this beyond a placeholder.
    state: "perlis",
    zakatAgency: "Majlis Agama Islam dan Adat Istiadat Melayu Perlis (MAIPs)",
    nisabRM: 45825.48,
    goldUrufWornGrams: null,
    sourceUrl: null,
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "pulau_pinang",
    zakatAgency: "Zakat Pulau Pinang (MAINPP)",
    nisabRM: 33890.0,
    goldUrufWornGrams: null,
    sourceUrl: "https://zakat.mainpp.gov.my",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "sabah",
    zakatAgency: "Pusat Zakat Sabah",
    nisabRM: 36979.0,
    goldUrufWornGrams: null,
    sourceUrl: "https://appszakat.sabah.gov.my/zakat/kalkulatorPendapatan.php",
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    // No source URL located yet — see SCRAPING.md's Sarawak entry.
    state: "sarawak",
    zakatAgency: "Tabung Baitulmal Sarawak (TBS)",
    nisabRM: 38398.0,
    goldUrufWornGrams: null,
    sourceUrl: null,
    asOf: "2026-08-31T00:00:00.000Z",
  },
  {
    state: "terengganu",
    zakatAgency: "Majlis Agama Islam dan Adat Istiadat Melayu Terengganu (MAIDAM)",
    nisabRM: 47685.52,
    goldUrufWornGrams: null,
    sourceUrl: "https://ezakat.maidam.gov.my/online/",
    asOf: "2026-08-31T00:00:00.000Z",
  },
];

export const STATIC_NISAB_FALLBACK: StateNisabRate[] = RAW_ENTRIES.map((entry) => ({
  ...entry,
  isScraped: entry.sourceUrl !== null,
}));

export function getStaticFallbackFor(state: MalaysiaStateKey): StateNisabRate | null {
  return STATIC_NISAB_FALLBACK.find((r) => r.state === state) ?? null;
}
