package nisabai

import (
	"go-fiber-app/config"
	"go-fiber-app/pkg/db"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestParseGeminiText(t *testing.T) {
	t.Run("valid structured-output JSON parses into states", func(t *testing.T) {
		text := `{"states":[{"state":"selangor","nisabRM":38748},{"state":"johor","nisabRM":37000}]}`
		states, err := parseGeminiText(text)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(states) != 2 {
			t.Fatalf("got %d states, want 2", len(states))
		}
		if states[0].State != "selangor" || states[0].NisabRM != 38748 {
			t.Fatalf("got %+v", states[0])
		}
		if states[0].AsOf == "" {
			t.Fatalf("expected AsOf to be stamped, got empty string")
		}
	})

	t.Run("invalid JSON errors", func(t *testing.T) {
		if _, err := parseGeminiText("not json"); err == nil {
			t.Fatalf("expected an error for invalid JSON")
		}
	})

	t.Run("empty states array errors", func(t *testing.T) {
		if _, err := parseGeminiText(`{"states":[]}`); err == nil {
			t.Fatalf("expected an error for an empty states array")
		}
	})

	t.Run("entries with missing state or non-positive nisabRM are filtered out", func(t *testing.T) {
		text := `{"states":[{"state":"selangor","nisabRM":38748},{"state":"","nisabRM":1000},{"state":"johor","nisabRM":0}]}`
		states, err := parseGeminiText(text)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(states) != 1 || states[0].State != "selangor" {
			t.Fatalf("got %+v, want only the selangor entry", states)
		}
	})

	t.Run("all entries filtered out errors instead of returning an empty result", func(t *testing.T) {
		text := `{"states":[{"state":"","nisabRM":0}]}`
		if _, err := parseGeminiText(text); err == nil {
			t.Fatalf("expected an error when every entry is unusable")
		}
	})

	t.Run("sourceUrl is preserved when present, empty when absent", func(t *testing.T) {
		text := `{"states":[{"state":"selangor","nisabRM":38748,"sourceUrl":"https://www.zakatselangor.com.my/"},{"state":"johor","nisabRM":45825.48}]}`
		states, err := parseGeminiText(text)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if states[0].SourceURL != "https://www.zakatselangor.com.my/" {
			t.Fatalf("got %+v", states[0])
		}
		if states[1].SourceURL != "" {
			t.Fatalf("got %+v, want an empty SourceURL", states[1])
		}
	})
}

// The search prompt deliberately does NOT itemize all 14 state names
// (see the comment on buildSearchPrompt) — a version that did was verified
// live to make the model omit states rather than search harder for them.
// This just checks the prompt still asks for all 14 states and scopes to
// the right zakat type.
func TestDropImplausibleKeepsFiguresWithinBandOfReference(t *testing.T) {
	reference := 30000.0
	states := []StateNisab{
		{State: "selangor", NisabRM: 38748},  // 1.29x, within 0.5x-3x
		{State: "sabah", NisabRM: 12000},     // 0.4x, too low, dropped
		{State: "johor", NisabRM: 95000},     // 3.17x, too high, dropped
		{State: "kedah", NisabRM: 32871.27},  // 1.10x, within band
	}
	kept := dropImplausible(states, reference)
	if len(kept) != 2 {
		t.Fatalf("got %d states, want 2: %+v", len(kept), kept)
	}
	for _, s := range kept {
		if s.State != "selangor" && s.State != "kedah" {
			t.Fatalf("unexpected state kept: %+v", s)
		}
	}
}

func TestDropImplausibleIsANoOpWithoutAReference(t *testing.T) {
	states := []StateNisab{{State: "selangor", NisabRM: 38748}}
	kept := dropImplausible(states, 0)
	if len(kept) != 1 {
		t.Fatalf("got %+v, want the input unchanged when there's no reference to compare against", kept)
	}
}

func TestLooksGenericallyFlatDetectsATightCluster(t *testing.T) {
	// Reproduces a live-verified bad run: RM22,669.53-29,376.08, ratio ~1.30.
	tight := []StateNisab{
		{State: "a", NisabRM: 22669.53}, {State: "b", NisabRM: 24198}, {State: "c", NisabRM: 25995.67},
		{State: "d", NisabRM: 26369.91}, {State: "e", NisabRM: 27696}, {State: "f", NisabRM: 29376.08},
	}
	if !looksGenericallyFlat(tight) {
		t.Fatalf("expected a ~1.3x-spread batch to be flagged as suspiciously flat")
	}
}

func TestLooksGenericallyFlatAcceptsRealisticSpread(t *testing.T) {
	// A live-verified good run: RM25,995.67-45,825.48, ratio ~1.76.
	spread := []StateNisab{
		{State: "a", NisabRM: 25995.67}, {State: "b", NisabRM: 32871.27}, {State: "c", NisabRM: 37401},
		{State: "d", NisabRM: 40092.42}, {State: "e", NisabRM: 42175}, {State: "f", NisabRM: 45825.48},
	}
	if looksGenericallyFlat(spread) {
		t.Fatalf("expected a realistic ~1.76x-spread batch not to be flagged")
	}
}

func TestLooksGenericallyFlatIgnoresSmallBatches(t *testing.T) {
	// Too few states to draw a conclusion from — legitimate when most
	// states got dropped by dropImplausible, shouldn't also fail this check.
	small := []StateNisab{{State: "a", NisabRM: 30000}, {State: "b", NisabRM: 30001}}
	if looksGenericallyFlat(small) {
		t.Fatalf("expected a small batch to be exempt from the flatness check")
	}
}

func TestBuildSearchPromptAsksForAllStatesAndTheRightZakatType(t *testing.T) {
	prompt := buildSearchPrompt()
	for _, want := range []string{"14 states", "Malaysia", "zakat harta", "zakat fitrah", "zakat pendapatan"} {
		if !contains(strings.ToLower(prompt), strings.ToLower(want)) {
			t.Fatalf("prompt is missing %q:\n%s", want, prompt)
		}
	}
}

// Scraping was removed in favor of relying on Gemini's own source
// attribution (see nisabstate — IsScraped is now derived from whether
// Gemini cited a URL, not an independent scrape) — this prompt is the only
// place that attribution gets requested, so it must ask for a source URL
// and explicitly prefer the state's own official site over a secondary one.
func TestBuildSearchPromptAsksForASourceUrlPreferringTheOfficialSite(t *testing.T) {
	prompt := strings.ToLower(buildSearchPrompt())
	for _, want := range []string{"url", "official", "legitimate source"} {
		if !contains(prompt, want) {
			t.Fatalf("prompt is missing %q:\n%s", want, prompt)
		}
	}
}

func TestBuildReformatPromptCoversEveryStateKey(t *testing.T) {
	prompt := buildReformatPrompt("some grounded notes")
	for _, key := range StateKeys {
		if !contains(prompt, key) {
			t.Fatalf("prompt is missing state key %q:\n%s", key, prompt)
		}
	}
	if !contains(prompt, "some grounded notes") {
		t.Fatalf("prompt is missing the grounded text to reformat")
	}
	if !contains(strings.ToLower(prompt), "source url") {
		t.Fatalf("prompt is missing a request to extract the source URL:\n%s", prompt)
	}
}

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (func() bool {
		for i := 0; i+len(needle) <= len(haystack); i++ {
			if haystack[i:i+len(needle)] == needle {
				return true
			}
		}
		return false
	})()
}

func setupTestDB(t *testing.T) {
	t.Helper()
	cfg := &config.Config{DBPath: filepath.Join(t.TempDir(), "test.sqlite")}
	if err := db.InitDB(cfg); err != nil {
		t.Fatalf("failed to init test db: %v", err)
	}
	// TempDir's cleanup deletes the underlying file before the *sql.DB is
	// closed otherwise, which fails on Windows (file still locked) — close
	// the connection first so cleanup can remove it.
	t.Cleanup(func() { _ = db.GetDB().Close() })
}

func TestGetStateNisabCachesWithinTheSameMonth(t *testing.T) {
	setupTestDB(t)

	month := monthKey(time.Now())
	cacheSet(month, []StateNisab{{State: "selangor", NisabRM: 38748, AsOf: month}})

	cached, ok := cacheGet(month)
	if !ok {
		t.Fatalf("expected a cache hit for the current month")
	}
	if cached.CachedMonth != month || len(cached.States) != 1 || cached.States[0].NisabRM != 38748 {
		t.Fatalf("got %+v", cached)
	}

	// A service with no API key must never call Gemini — it should return
	// exactly what's cached for the current month without attempting a
	// fetch (there's no key to fetch with).
	svc := NewService("")
	result := svc.GetStateNisab()
	if result.CachedMonth != month || len(result.States) != 1 {
		t.Fatalf("got %+v, want the cached current-month result", result)
	}
}

func TestGetStateNisabFallsBackToLatestCachedMonthWhenUnconfigured(t *testing.T) {
	setupTestDB(t)

	// Seed a past month's cache but nothing for the current month.
	cacheSet("2020-01", []StateNisab{{State: "johor", NisabRM: 30000, AsOf: "2020-01"}})

	svc := NewService("") // no API key configured — must not attempt a Gemini call
	result := svc.GetStateNisab()
	if result.CachedMonth != "2020-01" || len(result.States) != 1 || result.States[0].State != "johor" {
		t.Fatalf("got %+v, want a fallback to the last cached month", result)
	}
}

func TestGetStateNisabReturnsEmptyWhenNothingIsCachedAndUnconfigured(t *testing.T) {
	setupTestDB(t)

	svc := NewService("")
	result := svc.GetStateNisab()
	if len(result.States) != 0 {
		t.Fatalf("got %+v, want an empty result with no cache and no API key", result)
	}
}
