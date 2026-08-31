package nisabstate

import (
	"go-fiber-app/config"
	"go-fiber-app/internal/nisabai"
	"go-fiber-app/pkg/db"
	"path/filepath"
	"testing"
)

func setupTestDB(t *testing.T) {
	t.Helper()
	cfg := &config.Config{DBPath: filepath.Join(t.TempDir(), "test.sqlite")}
	if err := db.InitDB(cfg); err != nil {
		t.Fatalf("failed to init test db: %v", err)
	}
	t.Cleanup(func() { _ = db.GetDB().Close() })
}

func seedAiCache(t *testing.T, state, agency, sourceURL string, nisabRM float64) {
	t.Helper()
	_, err := db.GetDB().Exec(
		`INSERT INTO nisab_ai_cache (state, cached_month, zakat_agency, nisab_rm, source_url)
		 VALUES (?, strftime('%Y-%m', 'now'), ?, ?, ?)`,
		state, agency, nisabRM, sourceURL,
	)
	if err != nil {
		t.Fatalf("failed to seed AI cache: %v", err)
	}
}

func TestGetAllStatesTagsIsScrapedByWhetherASourceUrlWasCited(t *testing.T) {
	setupTestDB(t)

	// selangor: Gemini cited a real source — trusted, IsScraped:true.
	seedAiCache(t, "selangor", "Lembaga Zakat Selangor (LZS)", "https://www.zakatselangor.com.my/", 38748)
	// kelantan: Gemini found a figure but couldn't attribute a source — IsScraped:false.
	seedAiCache(t, "kelantan", "MAIK", "", 37401)

	svc := NewService(nisabai.NewService(""))
	result := svc.GetAllStates()

	byState := map[string]Entry{}
	for _, e := range result.States {
		byState[e.State] = e
	}

	selangor, ok := byState["selangor"]
	if !ok || !selangor.IsScraped || selangor.SourceURL != "https://www.zakatselangor.com.my/" {
		t.Fatalf("got %+v, ok=%v — want IsScraped:true with the cited URL", selangor, ok)
	}

	kelantan, ok := byState["kelantan"]
	if !ok || kelantan.IsScraped || kelantan.SourceURL != "" {
		t.Fatalf("got %+v, ok=%v — want IsScraped:false with no URL", kelantan, ok)
	}
}

func TestGetAllStatesOmitsStatesWithNoAiFigureAtAll(t *testing.T) {
	setupTestDB(t)
	seedAiCache(t, "selangor", "Lembaga Zakat Selangor (LZS)", "https://www.zakatselangor.com.my/", 38748)

	svc := NewService(nisabai.NewService(""))
	result := svc.GetAllStates()

	if len(result.States) != 1 || result.States[0].State != "selangor" {
		t.Fatalf("got %d states, want exactly 1 (selangor): %+v", len(result.States), result.States)
	}
}

func TestGetAllStatesFallsBackToTheCanonicalStateLabelWhenNoAgencyWasProvided(t *testing.T) {
	setupTestDB(t)
	seedAiCache(t, "sabah", "", "", 36979)

	svc := NewService(nisabai.NewService(""))
	result := svc.GetAllStates()

	if len(result.States) != 1 || result.States[0].ZakatAgency == "" {
		t.Fatalf("got %+v, want a non-empty fallback agency label", result.States)
	}
}
