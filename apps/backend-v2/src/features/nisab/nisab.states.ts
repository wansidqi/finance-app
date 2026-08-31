// The canonical list of the 14 Malaysian zakat jurisdictions this feature
// tracks nisab for. Colocated here rather than in shared/ since only the
// nisab feature uses it today — promote to shared/ if a second feature
// ever needs it too. Must stay in sync with apps/mobile's
// interface/nisab-state.ts MalaysiaStateKey union and apps/backend's (Go
// v1) pkg/malaysiastate.
export const STATE_KEYS = [
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
] as const;

export type StateKey = (typeof STATE_KEYS)[number];

export const STATE_LABELS: Record<StateKey, string> = {
  selangor: "Selangor",
  wp_kl_putrajaya_labuan: "Wilayah Persekutuan (Kuala Lumpur, Putrajaya, Labuan)",
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
