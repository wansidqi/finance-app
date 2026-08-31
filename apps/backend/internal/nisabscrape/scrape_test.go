package nisabscrape

import (
	"context"
	"errors"
	"go-fiber-app/config"
	"go-fiber-app/pkg/db"
	"path/filepath"
	"testing"
	"time"
)

func TestParseNisabAmount(t *testing.T) {
	t.Run("finds an RM amount following the anchor phrase", func(t *testing.T) {
		html := `<p>Kadar nisab zakat pendapatan tahun 2026 ialah RM38,748.00 setahun.</p>`
		amount, ok := ParseNisabAmount(html, "kadar nisab zakat pendapatan tahun 2026")
		if !ok || amount != 38748 {
			t.Fatalf("got (%v, %v), want (38748, true)", amount, ok)
		}
	})

	t.Run("is case-insensitive on both anchor and surrounding HTML", func(t *testing.T) {
		html := `<DIV>Nisab Semasa: <b>RM 33,996</b></DIV>`
		amount, ok := ParseNisabAmount(html, "nisab semasa")
		if !ok || amount != 33996 {
			t.Fatalf("got (%v, %v), want (33996, true)", amount, ok)
		}
	})

	t.Run("returns false when the anchor isn't found", func(t *testing.T) {
		_, ok := ParseNisabAmount("<p>Some unrelated page content.</p>", "kadar nisab semasa")
		if ok {
			t.Fatalf("expected no match")
		}
	})
}

func TestPickCurrentSelangorEntry(t *testing.T) {
	entries := []SelangorNisabEntry{
		{Tahun: "2026 (Julai - Disember)", Jumlah: "RM 38,748.00"},
		{Tahun: "2026 (Jan - Jun)", Jumlah: "RM 42,047.00"},
		{Tahun: "2025 (Julai - Disember)", Jumlah: "RM 35,449.00"},
	}

	t.Run("picks the Jul-Dec entry for a date in the second half of the year", func(t *testing.T) {
		result := PickCurrentSelangorEntry(entries, time.Date(2026, time.August, 29, 0, 0, 0, 0, time.UTC))
		if result == nil || result.Jumlah != "RM 38,748.00" {
			t.Fatalf("got %+v", result)
		}
	})

	t.Run("picks the Jan-Jun entry for a date in the first half of the year", func(t *testing.T) {
		result := PickCurrentSelangorEntry(entries, time.Date(2026, time.March, 15, 0, 0, 0, 0, time.UTC))
		if result == nil || result.Jumlah != "RM 42,047.00" {
			t.Fatalf("got %+v", result)
		}
	})

	t.Run("returns nil when no entry matches the current year", func(t *testing.T) {
		result := PickCurrentSelangorEntry(entries, time.Date(2030, time.January, 1, 0, 0, 0, 0, time.UTC))
		if result != nil {
			t.Fatalf("got %+v, want nil", result)
		}
	})
}

func TestParseTerengganuTable(t *testing.T) {
	// Trimmed snippet of the real ezakat.maidam.gov.my/online/nisab.php
	// table — reproduces the exact shape that made the old generic
	// anchor+"nearest RM" scrape mis-extract the *year* (2025) as if it
	// were the RM figure, instead of the real amount (RM39,860.40).
	html := `
		<table>
			<thead>
				<tr><th class="text-center">TAHUN TAKSIRAN</th><th class="text-center">RM</th></tr>
			</thead>
			<tbody>
				<tr><td class="text-center">2025</td><td class="text-center">39,860.40</td></tr>
				<tr><td class="text-center">2024</td><td class="text-center">29,376.08</td></tr>
				<tr><td class="text-center">2023</td><td class="text-center">24,066.63</td></tr>
			</tbody>
		</table>
	`

	t.Run("parses every year/amount row, ignoring the header row", func(t *testing.T) {
		entries := ParseTerengganuTable(html)
		want := []TerengganuNisabEntry{{2025, 39860.4}, {2024, 29376.08}, {2023, 24066.63}}
		if len(entries) != len(want) {
			t.Fatalf("got %+v, want %+v", entries, want)
		}
		for i := range want {
			if entries[i] != want[i] {
				t.Fatalf("entry %d: got %+v, want %+v", i, entries[i], want[i])
			}
		}
	})

	t.Run("returns nothing for a page with no matching rows", func(t *testing.T) {
		if entries := ParseTerengganuTable("<p>no table here</p>"); len(entries) != 0 {
			t.Fatalf("got %+v, want none", entries)
		}
	})

	t.Run("picks the exact-year entry when the current year is published", func(t *testing.T) {
		entries := ParseTerengganuTable(html)
		result := PickCurrentTerengganuEntry(entries, time.Date(2025, time.November, 1, 0, 0, 0, 0, time.UTC))
		if result == nil || *result != (TerengganuNisabEntry{2025, 39860.4}) {
			t.Fatalf("got %+v", result)
		}
	})

	t.Run("falls back to the most recent past year when the current year isn't published yet", func(t *testing.T) {
		// Matches the real state as of 2026-08-31: no 2026 row exists yet.
		entries := ParseTerengganuTable(html)
		result := PickCurrentTerengganuEntry(entries, time.Date(2026, time.August, 31, 0, 0, 0, 0, time.UTC))
		if result == nil || *result != (TerengganuNisabEntry{2025, 39860.4}) {
			t.Fatalf("got %+v", result)
		}
	})

	t.Run("returns nil when every entry is in the future", func(t *testing.T) {
		entries := ParseTerengganuTable(html)
		result := PickCurrentTerengganuEntry(entries, time.Date(2020, time.January, 1, 0, 0, 0, 0, time.UTC))
		if result != nil {
			t.Fatalf("got %+v, want nil", result)
		}
	})
}

func setupTestDB(t *testing.T) {
	t.Helper()
	cfg := &config.Config{DBPath: filepath.Join(t.TempDir(), "test.sqlite")}
	if err := db.InitDB(cfg); err != nil {
		t.Fatalf("failed to init test db: %v", err)
	}
	t.Cleanup(func() { _ = db.GetDB().Close() })
}

func TestSyncOneAndGetAllCached(t *testing.T) {
	setupTestDB(t)

	t.Run("a successful fetchOverride is persisted and readable", func(t *testing.T) {
		SyncOne(context.Background(), AuthorityConfig{
			State:         "selangor",
			AuthorityName: "Lembaga Zakat Selangor (LZS)",
			URL:           "https://example.com/selangor",
			FetchOverride: func(ctx context.Context) (float64, error) { return 38748, nil },
		})

		cached := GetAllCached()
		got, ok := cached["selangor"]
		if !ok || !got.HasRate || got.NisabRM != 38748 || got.LastError != "" {
			t.Fatalf("got %+v, ok=%v", got, ok)
		}
	})

	t.Run("a failing fetch is recorded without a rate, and doesn't clobber a previously good one", func(t *testing.T) {
		SyncOne(context.Background(), AuthorityConfig{
			State:         "johor",
			AuthorityName: "Test",
			URL:           "https://example.com/johor",
			FetchOverride: func(ctx context.Context) (float64, error) { return 45825.48, nil },
		})
		SyncOne(context.Background(), AuthorityConfig{
			State:         "johor",
			AuthorityName: "Test",
			URL:           "https://example.com/johor",
			FetchOverride: func(ctx context.Context) (float64, error) { return 0, errors.New("boom") },
		})

		cached := GetAllCached()
		got, ok := cached["johor"]
		// The rate from the earlier success is retained: HasRate stays true
		// and NisabRM stays 45825.48 even though the latest sync failed —
		// only LastError reflects the most recent attempt.
		if !ok || !got.HasRate || got.NisabRM != 45825.48 || got.LastError != "boom" {
			t.Fatalf("got %+v, ok=%v", got, ok)
		}
	})
}

func TestShouldRunScheduledSync(t *testing.T) {
	// Writes directly to nisab_scrape_sync_state rather than calling
	// SyncAll — SyncAll hits the real 8 external authority sites in
	// Authorities, which a unit test shouldn't depend on (slow, flaky,
	// blocked in sandboxed/offline environments).
	setSyncedAt := func(t *testing.T, when time.Time) {
		t.Helper()
		_, err := db.GetDB().Exec(
			`INSERT INTO nisab_scrape_sync_state (id, last_synced_at) VALUES (1, ?)
			 ON CONFLICT(id) DO UPDATE SET last_synced_at = excluded.last_synced_at`,
			when,
		)
		if err != nil {
			t.Fatalf("failed to seed sync state: %v", err)
		}
	}

	t.Run("true when nothing has ever synced", func(t *testing.T) {
		setupTestDB(t)
		if !ShouldRunScheduledSync() {
			t.Fatalf("expected true for a fresh database")
		}
	})

	t.Run("false right after a recent sync", func(t *testing.T) {
		setupTestDB(t)
		setSyncedAt(t, time.Now().UTC())
		if ShouldRunScheduledSync() {
			t.Fatalf("expected false right after a sync")
		}
	})

	t.Run("true once the interval has elapsed", func(t *testing.T) {
		setupTestDB(t)
		setSyncedAt(t, time.Now().UTC().Add(-(ScrapeSyncIntervalDays+1)*24*time.Hour))
		if !ShouldRunScheduledSync() {
			t.Fatalf("expected true once %d days have passed", ScrapeSyncIntervalDays)
		}
	})
}
