// Package nisab computes the current zakat nisab threshold (85 grams of
// gold, valued in RM) using Bank Negara Malaysia's official Kijang Emas
// gold price — a live, authoritative Malaysian source, rather than a fixed
// constant that goes stale as gold prices move.
package nisab

import (
	"encoding/json"
	"fmt"
	"go-fiber-app/pkg/db"
	"net/http"
	"sync"
	"time"
)

// GramsRequired is the sharia nisab threshold: 85 grams of gold.
const GramsRequired = 85.0

// gramsPerTroyOunce converts BNM's Kijang Emas price (quoted per troy
// ounce) to a per-gram price.
const gramsPerTroyOunce = 31.1034768

// FallbackRM is used only when BNM has never been reachable and there's no
// cached value at all — an approximate value, not a live one.
const FallbackRM = 29740.0

// FallbackPricePerGram is the per-gram equivalent of FallbackRM, used under
// the same no-cache-no-connection circumstances.
const FallbackPricePerGram = FallbackRM / GramsRequired

// Value returns the current nisab in RM, preferring a live BNM price and
// falling back to the last cached value (or FallbackRM) if unreachable.
func Value() float64 {
	return current().nisabRM
}

// PricePerGram returns today's gold price per gram in RM, from the same
// live/cached BNM source backing Value — so an asset priced from this and
// the nisab it's compared against always agree on where the price came from.
func PricePerGram() float64 {
	return current().pricePerGram
}

// current returns today's nisab figures, live from BNM when possible,
// falling back to the last cached value or FallbackRM/FallbackPricePerGram
// if BNM has never been reachable.
func current() nisabResult {
	cached, found := cacheGet()
	today := time.Now().UTC().Format("2006-01-02")

	if found && cached.cachedOn == today {
		return nisabResult{pricePerGram: cached.pricePerGram, nisabRM: cached.nisabRM}
	}

	if breakerOpen() {
		if found {
			return nisabResult{pricePerGram: cached.pricePerGram, nisabRM: cached.nisabRM}
		}
		return nisabResult{pricePerGram: FallbackPricePerGram, nisabRM: FallbackRM}
	}

	fetched, err := fetchFromBNM()
	if err != nil {
		recordFailure()
		if found {
			return nisabResult{pricePerGram: cached.pricePerGram, nisabRM: cached.nisabRM}
		}
		return nisabResult{pricePerGram: FallbackPricePerGram, nisabRM: FallbackRM}
	}
	recordSuccess()

	result := computeNisab(fetched.oneOzBuying, fetched.oneOzSelling)
	cacheSet(fetched.effectiveDate, result.pricePerGram, result.nisabRM, today)
	return result
}

type nisabResult struct {
	pricePerGram float64
	nisabRM      float64
}

// computeNisab derives nisab from BNM's buying/selling quotes for one troy
// ounce, using their average as the market price.
func computeNisab(oneOzBuying, oneOzSelling float64) nisabResult {
	avgPerOz := (oneOzBuying + oneOzSelling) / 2
	pricePerGram := avgPerOz / gramsPerTroyOunce
	return nisabResult{
		pricePerGram: pricePerGram,
		nisabRM:      pricePerGram * GramsRequired,
	}
}

type cachedNisab struct {
	pricePerGram float64
	nisabRM      float64
	cachedOn     string
}

func cacheGet() (cachedNisab, bool) {
	var row struct {
		PricePerGram float64 `db:"price_per_gram"`
		NisabRM      float64 `db:"nisab_rm"`
		CachedOn     string  `db:"cached_on"`
	}
	err := db.GetDB().Get(&row, `SELECT price_per_gram, nisab_rm, cached_on FROM nisab_cache WHERE id = 1`)
	if err != nil {
		return cachedNisab{}, false
	}
	return cachedNisab{pricePerGram: row.PricePerGram, nisabRM: row.NisabRM, cachedOn: row.CachedOn}, true
}

func cacheSet(effectiveDate string, pricePerGram, nisabRM float64, cachedOn string) {
	_, _ = db.GetDB().Exec(
		`INSERT INTO nisab_cache (id, effective_date, price_per_gram, nisab_rm, cached_on)
		 VALUES (1, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		 	effective_date = excluded.effective_date,
		 	price_per_gram = excluded.price_per_gram,
		 	nisab_rm = excluded.nisab_rm,
		 	cached_on = excluded.cached_on`,
		effectiveDate, pricePerGram, nisabRM, cachedOn,
	)
}

// --- Bank Negara Malaysia Open API ---

const bnmEndpoint = "https://api.bnm.gov.my/public/kijang-emas"

var httpClient = &http.Client{Timeout: 4 * time.Second}

type bnmPrice struct {
	effectiveDate string
	oneOzBuying   float64
	oneOzSelling  float64
}

func fetchFromBNM() (bnmPrice, error) {
	req, err := http.NewRequest(http.MethodGet, bnmEndpoint, nil)
	if err != nil {
		return bnmPrice{}, err
	}
	req.Header.Set("Accept", "application/vnd.BNM.API.v1+json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return bnmPrice{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return bnmPrice{}, fmt.Errorf("bnm api returned status %d", resp.StatusCode)
	}

	var body struct {
		Data struct {
			EffectiveDate string `json:"effective_date"`
			OneOz         struct {
				Buying  float64 `json:"buying"`
				Selling float64 `json:"selling"`
			} `json:"one_oz"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return bnmPrice{}, err
	}
	if body.Data.OneOz.Buying == 0 || body.Data.OneOz.Selling == 0 {
		return bnmPrice{}, fmt.Errorf("bnm api returned no gold price")
	}

	return bnmPrice{
		effectiveDate: body.Data.EffectiveDate,
		oneOzBuying:   body.Data.OneOz.Buying,
		oneOzSelling:  body.Data.OneOz.Selling,
	}, nil
}

// --- Circuit breaker ---
//
// Bounds worst-case latency when BNM is unreachable, same pattern as the
// hijri package's JAKIM lookup.
var (
	breakerMu    sync.Mutex
	breakerUntil time.Time
)

func breakerOpen() bool {
	breakerMu.Lock()
	defer breakerMu.Unlock()
	return time.Now().Before(breakerUntil)
}

func recordFailure() {
	breakerMu.Lock()
	defer breakerMu.Unlock()
	breakerUntil = time.Now().Add(60 * time.Second)
}

func recordSuccess() {
	breakerMu.Lock()
	defer breakerMu.Unlock()
	breakerUntil = time.Time{}
}
