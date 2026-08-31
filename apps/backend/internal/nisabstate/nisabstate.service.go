// Package nisabstate is the single source of truth the mobile app reads for
// per-state zakat nisab: it reads apps/backend's AI cache
// (internal/nisabai, Gemini's grounded search for all 14 states) and
// exposes it in one clean per-state list, tagged with whether Gemini cited
// a real source URL for that figure.
//
// This deliberately does NOT run its own independent scrape of each
// state's site anymore (internal/nisabscrape still exists and is fully
// tested, just not wired in here) — per direct instruction, trust is now
// signaled by whether Gemini's grounded search itself found and cited a
// real source for a state, preferring that state's own official zakat
// authority site and falling back to another legitimate source (e.g. news)
// rather than leaving a figure unsourced (see nisabai's buildSearchPrompt).
// `IsScraped` is kept as the field name for wire compatibility with
// apps/mobile, which already treats it purely as a trust/attribution flag,
// not literally "we personally scraped this page."
package nisabstate

import (
	"go-fiber-app/internal/nisabai"
	"go-fiber-app/pkg/malaysiastate"
)

// Entry is one state's resolved nisab figure.
type Entry struct {
	State             string   `json:"state"`
	ZakatAgency       string   `json:"zakatAgency"`
	NisabRM           float64  `json:"nisabRM"`
	GoldUrufWornGrams *float64 `json:"goldUrufWornGrams,omitempty"`
	SourceURL         string   `json:"sourceUrl,omitempty"`
	// True when Gemini's grounded search cited a real source URL for this
	// figure (preferring the state's own official site, per
	// nisabai.buildSearchPrompt); false when it couldn't attribute one.
	IsScraped bool   `json:"isScraped"`
	AsOf      string `json:"asOf"`
}

type Result struct {
	States []Entry `json:"states"`
}

type Service struct {
	ai *nisabai.Service
}

func NewService(ai *nisabai.Service) *Service {
	return &Service{ai: ai}
}

// GetAllStates returns one entry per Malaysian jurisdiction the AI cache
// currently has a figure for — a jurisdiction with none is simply omitted,
// same "degrade gracefully" rule apps/mobile's resolver already follows
// (it falls further back to PPZ, then the nationwide gold-price nisab, for
// whatever's missing here).
//
// This just reads SQLite — nisabai.GetStateNisab only ever kicks off a
// refresh in the background when its cache is stale, and immediately
// returns whatever's currently cached; it never blocks this request on a
// live Gemini call (which can take 20-30+ seconds). The freshest data
// available is served on the very next request after a background refresh
// completes.
func (s *Service) GetAllStates() Result {
	ai := s.ai.GetStateNisab()

	aiByState := make(map[string]nisabai.StateNisab, len(ai.States))
	for _, entry := range ai.States {
		aiByState[entry.State] = entry
	}

	entries := make([]Entry, 0, len(malaysiastate.Keys))
	for _, key := range malaysiastate.Keys {
		entry, ok := aiByState[key]
		if !ok {
			continue
		}

		agency := entry.ZakatAgency
		if agency == "" {
			agency = malaysiastate.Labels[key]
		}
		entries = append(entries, Entry{
			State:             key,
			ZakatAgency:       agency,
			NisabRM:           entry.NisabRM,
			GoldUrufWornGrams: entry.GoldUrufWornGrams,
			SourceURL:         entry.SourceURL,
			IsScraped:         entry.SourceURL != "",
			AsOf:              entry.AsOf,
		})
	}

	return Result{States: entries}
}
