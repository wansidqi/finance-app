// Package malaysiastate is the single canonical list of the 14 Malaysian
// zakat jurisdictions this app tracks nisab for — shared by nisabai
// (Gemini prompts), nisabscrape (which states have no live scraper
// configured), and nisabstate (the merge across both). Keep in sync with
// apps/mobile/interface/nisab-state.ts's MalaysiaStateKey union.
package malaysiastate

// Keys is every tracked jurisdiction's canonical snake_case key.
var Keys = []string{
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
}

// Labels gives a human-readable jurisdiction name per key.
var Labels = map[string]string{
	"selangor":               "Selangor",
	"wp_kl_putrajaya_labuan": "Wilayah Persekutuan (Kuala Lumpur, Putrajaya, Labuan)",
	"johor":                  "Johor",
	"kedah":                  "Kedah",
	"kelantan":               "Kelantan",
	"melaka":                 "Melaka",
	"negeri_sembilan":        "Negeri Sembilan",
	"pahang":                 "Pahang",
	"perak":                  "Perak",
	"perlis":                 "Perlis",
	"pulau_pinang":           "Pulau Pinang",
	"sabah":                  "Sabah",
	"sarawak":                "Sarawak",
	"terengganu":             "Terengganu",
}
