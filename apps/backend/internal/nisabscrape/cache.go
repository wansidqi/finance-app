package nisabscrape

import (
	"context"
	"go-fiber-app/pkg/db"
	"go-fiber-app/pkg/logger"
	"sync"
	"time"
)

// ScrapeSyncIntervalDays mirrors apps/mobile's STATE_SYNC_INTERVAL_DAYS —
// state nisab pages change far less often than a daily job would need, but
// scraping 8 heterogeneous sites is more failure-prone than one API, so a
// shorter interval means a broken anchor gets noticed (via LastError) sooner.
const ScrapeSyncIntervalDays = 30

type ScrapedState struct {
	State         string
	AuthorityName string
	NisabRM       float64
	HasRate       bool
	SourceURL     string
	LastCheckedAt time.Time
	LastError     string
}

type scrapeCacheRow struct {
	State         string    `db:"state"`
	ZakatAgency   string    `db:"zakat_agency"`
	NisabRM       *float64  `db:"nisab_rm"`
	SourceURL     string    `db:"source_url"`
	LastCheckedAt time.Time `db:"last_checked_at"`
	LastError     *string   `db:"last_error"`
}

// GetAllCached returns every jurisdiction's last-known scrape outcome,
// including ones that are currently failing (HasRate=false) — callers that
// only want usable rates should filter on HasRate themselves, mirroring
// apps/mobile's getStateNisab/getAllStateNisabRates split.
func GetAllCached() map[string]ScrapedState {
	var rows []scrapeCacheRow
	if err := db.GetDB().Select(&rows, `SELECT state, zakat_agency, nisab_rm, source_url, last_checked_at, last_error FROM nisab_scrape_cache`); err != nil {
		return map[string]ScrapedState{}
	}

	out := make(map[string]ScrapedState, len(rows))
	for _, r := range rows {
		s := ScrapedState{
			State:         r.State,
			AuthorityName: r.ZakatAgency,
			SourceURL:     r.SourceURL,
			LastCheckedAt: r.LastCheckedAt,
		}
		if r.NisabRM != nil {
			s.NisabRM = *r.NisabRM
			s.HasRate = true
		}
		if r.LastError != nil {
			s.LastError = *r.LastError
		}
		out[r.State] = s
	}
	return out
}

func recordSuccess(state, authorityName, sourceURL string, nisabRM float64, checkedAt time.Time) {
	_, _ = db.GetDB().Exec(
		`INSERT INTO nisab_scrape_cache (state, zakat_agency, nisab_rm, source_url, last_checked_at, last_error)
		 VALUES (?, ?, ?, ?, ?, NULL)
		 ON CONFLICT(state) DO UPDATE SET
		   zakat_agency = excluded.zakat_agency,
		   nisab_rm = excluded.nisab_rm,
		   source_url = excluded.source_url,
		   last_checked_at = excluded.last_checked_at,
		   last_error = NULL`,
		state, authorityName, nisabRM, sourceURL, checkedAt,
	)
}

// recordFailure keeps whatever nisab_rm was last successfully scraped (if
// any) untouched — same rationale as apps/mobile's recordFailure — so a
// transient site outage doesn't wipe out an otherwise-good cached rate.
func recordFailure(state, authorityName, sourceURL, errMsg string, checkedAt time.Time) {
	_, _ = db.GetDB().Exec(
		`INSERT INTO nisab_scrape_cache (state, zakat_agency, nisab_rm, source_url, last_checked_at, last_error)
		 VALUES (?, ?, NULL, ?, ?, ?)
		 ON CONFLICT(state) DO UPDATE SET
		   zakat_agency = excluded.zakat_agency,
		   source_url = excluded.source_url,
		   last_checked_at = excluded.last_checked_at,
		   last_error = excluded.last_error`,
		state, authorityName, sourceURL, checkedAt, errMsg,
	)
}

// SyncOne fetches+parses one jurisdiction and persists the outcome.
func SyncOne(ctx context.Context, cfg AuthorityConfig) {
	checkedAt := time.Now().UTC()
	amount, err := ScrapeOne(ctx, cfg)
	if err != nil {
		recordFailure(cfg.State, cfg.AuthorityName, cfg.URL, err.Error(), checkedAt)
		return
	}
	recordSuccess(cfg.State, cfg.AuthorityName, cfg.URL, amount, checkedAt)
}

// SyncAll runs every configured jurisdiction concurrently and independently
// — one site being down or restructured never blocks the others.
func SyncAll(ctx context.Context) {
	var wg sync.WaitGroup
	for _, cfg := range Authorities {
		wg.Add(1)
		go func(cfg AuthorityConfig) {
			defer wg.Done()
			SyncOne(ctx, cfg)
		}(cfg)
	}
	wg.Wait()

	now := time.Now().UTC()
	_, err := db.GetDB().Exec(
		`INSERT INTO nisab_scrape_sync_state (id, last_synced_at) VALUES (1, ?)
		 ON CONFLICT(id) DO UPDATE SET last_synced_at = excluded.last_synced_at`,
		now,
	)
	if err != nil && logger.ErrorLogger != nil {
		logger.ErrorLogger.Printf("nisabscrape: failed to record sync timestamp: %v", err)
	}
}

// ShouldRunScheduledSync reports whether it's been long enough since the
// last full sync to run another one — same lazy cache-on-read pattern as
// pkg/nisab and internal/nisabai, so no separate scheduler/cron is needed.
func ShouldRunScheduledSync() bool {
	var lastSyncedAt time.Time
	// last_synced_at is NOT NULL, so a missing row (sql.ErrNoRows, meaning
	// SyncAll has never completed) is the only error case — treat it the
	// same as "due for a sync".
	if err := db.GetDB().Get(&lastSyncedAt, `SELECT last_synced_at FROM nisab_scrape_sync_state WHERE id = 1`); err != nil {
		return true
	}
	return time.Since(lastSyncedAt) >= ScrapeSyncIntervalDays*24*time.Hour
}

var (
	refreshMu     sync.Mutex
	refreshInFlight bool
)

// EnsureFresh kicks off a background SyncAll if the cache is stale, and
// returns immediately without waiting for it — a synchronous refresh here
// would mean whichever request happens to land right after the cache goes
// stale gets stuck waiting on 8 external site fetches (up to ~8s each) for
// no reason, when the whole point of caching server-side is that no single
// request should ever have to wait on a live scrape. The stale cache keeps
// serving every request until the background refresh finishes and replaces
// it. `refreshInFlight` prevents piling up duplicate concurrent syncs if
// several requests land while one is already running.
func EnsureFresh() {
	if !ShouldRunScheduledSync() {
		return
	}

	refreshMu.Lock()
	if refreshInFlight {
		refreshMu.Unlock()
		return
	}
	refreshInFlight = true
	refreshMu.Unlock()

	// Deliberately detached from the request's context — the request that
	// triggered this may finish (and cancel its context) long before the
	// scrape does, but the scrape itself should still run to completion.
	go func() {
		defer func() {
			refreshMu.Lock()
			refreshInFlight = false
			refreshMu.Unlock()
		}()
		SyncAll(context.Background())
	}()
}
