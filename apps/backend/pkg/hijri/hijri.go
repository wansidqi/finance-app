// Package hijri converts Gregorian dates to Hijri dates for display.
//
// It prefers Malaysia's official JAKIM (e-Solat) calendar, fetched live and
// cached in SQLite, since the real Islamic calendar is sighting-based and
// can't be perfectly reproduced by arithmetic. When JAKIM's API is
// unreachable, it falls back to a tabular (arithmetic) estimate that can be
// off by a day or two from the real calendar.
package hijri

import (
	"encoding/json"
	"fmt"
	"go-fiber-app/pkg/db"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

var monthNames = [12]string{
	"Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Akhir",
	"Jumada al-Awwal", "Jumada al-Akhir", "Rajab", "Sha'ban",
	"Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah",
}

// Format renders a Gregorian date as a "D Month YYYYH" Hijri string, using
// JAKIM's published date when available and an arithmetic estimate
// otherwise.
func Format(t time.Time) string {
	if y, m, d, ok := lookup(t); ok {
		return formatYMD(y, m, d)
	}
	y, m, d := estimate(t)
	return formatYMD(y, m, d)
}

func formatYMD(year, month, day int) string {
	name := "?"
	if month >= 1 && month <= 12 {
		name = monthNames[month-1]
	}
	return strconv.Itoa(day) + " " + name + " " + strconv.Itoa(year) + "H"
}

// lookup returns JAKIM's Hijri date for t, from cache or a live fetch.
//
// A date that's already in the past when queried is sighting-confirmed and
// permanent, so its cache entry is trusted forever. A date that's still
// upcoming is only a JAKIM-published estimate (their own astronomical
// calculation, pre-sighting) and could still be revised as the real month
// approaches — so its cache entry is only trusted for the rest of the day it
// was fetched, and re-checked with JAKIM once per day after that until the
// date itself has passed.
func lookup(t time.Time) (year, month, day int, ok bool) {
	key := t.Format("2006-01-02")
	today := time.Now().UTC().Format("2006-01-02")

	cached, cachedOn, found := cacheGet(key)
	isSettled := key <= today
	isFreshEnough := found && cachedOn == today

	if found && (isSettled || isFreshEnough) {
		return parseYMD(cached)
	}

	if breakerOpen() {
		if found {
			return parseYMD(cached) // stale JAKIM data beats a rough estimate
		}
		return 0, 0, 0, false
	}

	fetched, err := fetchFromJakim(key)
	if err != nil {
		recordFailure()
		if found {
			return parseYMD(cached)
		}
		return 0, 0, 0, false
	}
	recordSuccess()

	cacheSet(key, fetched, today)
	return parseYMD(fetched)
}

func parseYMD(hijriDate string) (year, month, day int, ok bool) {
	parts := strings.Split(hijriDate, "-")
	if len(parts) != 3 {
		return 0, 0, 0, false
	}
	y, err1 := strconv.Atoi(parts[0])
	m, err2 := strconv.Atoi(parts[1])
	d, err3 := strconv.Atoi(parts[2])
	if err1 != nil || err2 != nil || err3 != nil {
		return 0, 0, 0, false
	}
	return y, m, d, true
}

func cacheGet(gregorianDate string) (hijriDate string, cachedOn string, found bool) {
	var row struct {
		HijriDate string `db:"hijri_date"`
		CachedOn  string `db:"cached_on"`
	}
	err := db.GetDB().Get(&row, `SELECT hijri_date, cached_on FROM hijri_cache WHERE gregorian_date = ?`, gregorianDate)
	if err != nil {
		return "", "", false
	}
	return row.HijriDate, row.CachedOn, true
}

func cacheSet(gregorianDate, hijriDate, cachedOn string) {
	_, _ = db.GetDB().Exec(
		`INSERT OR REPLACE INTO hijri_cache (gregorian_date, hijri_date, cached_on) VALUES (?, ?, ?)`,
		gregorianDate, hijriDate, cachedOn,
	)
}

// --- JAKIM e-Solat API ---
//
// Undocumented/unofficial endpoint — JAKIM may change or remove it without
// notice, hence the fallback estimate. The zone only affects prayer times,
// not the Hijri date, so a fixed Malaysia zone is used regardless of the
// user's actual location.
const jakimZone = "WLY01"

var httpClient = &http.Client{Timeout: 4 * time.Second}

func fetchFromJakim(dateStr string) (string, error) {
	endpoint := "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&zone=" + url.QueryEscape(jakimZone) + "&period=duration"

	form := url.Values{"datestart": {dateStr}, "dateend": {dateStr}}
	resp, err := httpClient.PostForm(endpoint, form)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("jakim api returned status %d", resp.StatusCode)
	}

	var body struct {
		PrayerTime []struct {
			Hijri string `json:"hijri"`
		} `json:"prayerTime"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", err
	}
	if len(body.PrayerTime) == 0 || body.PrayerTime[0].Hijri == "" {
		return "", fmt.Errorf("jakim api returned no hijri date")
	}

	return body.PrayerTime[0].Hijri, nil
}

// --- Circuit breaker ---
//
// Bounds worst-case latency when JAKIM is unreachable: after a failure, live
// lookups are skipped (falling straight to the estimate) for a cooldown
// window instead of timing out on every uncached date in the request.
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
