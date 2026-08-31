// Package nisabscrape scrapes each Malaysian state zakat authority's own
// published nisab figure directly from their websites, server-side —
// ported from apps/mobile's local/nisab-state-sync-service.ts, which used
// to do this same scrape independently on every single device. Running it
// here once and caching the result (see cache.go) means 100k app installs
// share one scrape pass instead of each one hitting these 8 external sites
// itself every sync interval.
package nisabscrape

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// AuthorityConfig is one Malaysian zakat jurisdiction's live source.
// `AnchorText` must be a verbatim, lowercase phrase taken from that page,
// near the RM figure, unique enough to locate it. A jurisdiction absent
// from Authorities simply has no live source configured — the caller falls
// back further (AI tier, then nationwide gold-price nisab), so an
// incomplete list degrades gracefully rather than breaking. Jurisdictions
// deliberately left out, and why (mirrors the original TS comment,
// verified as of 2026-08-29):
//   - Pulau Pinang (ZPP): only findable figure is an income-zakat page's
//     year-tagged reference, not the general zakat harta nisab needed here.
//   - Kelantan (MAIK): figure is embedded in an image, not text.
//   - Pahang (MUIP): candidate domains block plain HTTP fetches.
//   - Perak (MAIPk): dedicated nisab page is JS/image-rendered.
//   - Perlis (MAIPs): figure is injected client-side.
//   - Sarawak (TBS): no static RM figure, only a dynamic calculator.
type AuthorityConfig struct {
	State         string
	AuthorityName string
	URL           string
	AnchorText    string
	// FetchOverride replaces the generic anchor-based HTML scrape for
	// sources that expose structured data instead of prose (Selangor's
	// half-yearly JSON feed, Terengganu's year/amount history table).
	FetchOverride func(ctx context.Context) (float64, error)
}

const fetchTimeout = 8 * time.Second

var httpClient = &http.Client{Timeout: fetchTimeout}

func fetchText(ctx context.Context, url string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, fetchTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("request failed with status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(body), nil
}

var (
	tagPattern    = regexp.MustCompile(`<[^>]+>`)
	spacePattern  = regexp.MustCompile(`\s+`)
	amountPattern = regexp.MustCompile(`(?i)rm\s*([\d,]+(?:\.\d+)?)`)
)

const searchWindow = 400

func normalizeHTML(html string) string {
	s := tagPattern.ReplaceAllString(html, " ")
	s = strings.ReplaceAll(s, "&nbsp;", " ")
	s = strings.ReplaceAll(s, "&amp;", "&")
	s = strings.ReplaceAll(s, "&#8217;", "'")
	s = strings.ReplaceAll(s, "&rsquo;", "'")
	s = spacePattern.ReplaceAllString(s, " ")
	return strings.ToLower(s)
}

// ParseNisabAmount finds `anchorText` in the page and reads the nearest RM
// amount after it. Returns (0, false) rather than an error so one missed
// anchor doesn't take down a whole sync pass.
func ParseNisabAmount(html, anchorText string) (float64, bool) {
	text := normalizeHTML(html)
	anchorIndex := strings.Index(text, strings.ToLower(anchorText))
	if anchorIndex == -1 {
		return 0, false
	}

	end := anchorIndex + len(anchorText) + searchWindow
	if end > len(text) {
		end = len(text)
	}
	window := text[anchorIndex:end]

	match := amountPattern.FindStringSubmatch(window)
	if match == nil {
		return 0, false
	}

	amount, err := strconv.ParseFloat(strings.ReplaceAll(match[1], ",", ""), 64)
	if err != nil {
		return 0, false
	}
	return amount, true
}

// --- Selangor: structured half-yearly JSON feed ---

const selangorAjaxURL = "https://www.zakatselangor.com.my/wp-admin/admin-ajax.php?action=load_nisab_data"

type SelangorNisabEntry struct {
	// e.g. "2026 (Julai - Disember)" or "2026 (Jan - Jun)".
	Tahun string `json:"tahun"`
	// e.g. "RM 38,748.00".
	Jumlah string `json:"jumlah"`
}

// PickCurrentSelangorEntry picks the entry for the current year/half —
// LZS revises its published nisab twice a year rather than maintaining a
// single "current" figure, so this needs today's date, not just the latest
// array item. Pure/exported for unit testing.
func PickCurrentSelangorEntry(entries []SelangorNisabEntry, now time.Time) *SelangorNisabEntry {
	year := strconv.Itoa(now.Year())
	halfMarker := "julai"
	if now.Month() < time.July {
		halfMarker = "jan"
	}

	for i := range entries {
		normalized := strings.ToLower(entries[i].Tahun)
		if strings.Contains(normalized, year) && strings.Contains(normalized, halfMarker) {
			return &entries[i]
		}
	}
	return nil
}

var nonDigitDot = regexp.MustCompile(`[^\d.]`)

func fetchSelangorNisab(ctx context.Context) (float64, error) {
	text, err := fetchText(ctx, selangorAjaxURL)
	if err != nil {
		return 0, err
	}

	var parsed struct {
		Success bool                 `json:"success"`
		Data    []SelangorNisabEntry `json:"data"`
	}
	if err := json.Unmarshal([]byte(text), &parsed); err != nil || !parsed.Success {
		return 0, fmt.Errorf("unexpected response shape from Selangor nisab feed")
	}

	current := PickCurrentSelangorEntry(parsed.Data, time.Now())
	if current == nil {
		return 0, fmt.Errorf("no entry found for the current half-year period")
	}

	amount, err := strconv.ParseFloat(nonDigitDot.ReplaceAllString(current.Jumlah, ""), 64)
	if err != nil {
		return 0, fmt.Errorf("couldn't parse amount from %q", current.Jumlah)
	}
	return amount, nil
}

// --- Terengganu: year/amount history table, not RM-prefixed prose ---

const terengganuURL = "https://ezakat.maidam.gov.my/online/nisab.php"

type TerengganuNisabEntry struct {
	Year   int
	Amount float64
}

// MAIDAM publishes nisab as a "TAHUN TAKSIRAN | RM" history table (one row
// per year), not prose with "RM" directly prefixing the current figure —
// the generic anchor+"nearest RM" scrape mis-fires on this shape: after
// tag-stripping, "RM" (the column header) sits immediately before the
// *first row's year*, not its amount, so it would extract e.g. 2025 (the
// year) as if it were the RM figure. Confirmed live against the real page,
// and confirmed the real figure independently: RM39,860.40 for 2025 is
// exactly what Gemini's grounded search landed on too. Parsing the table
// structure directly is the correct fix, same idea as Selangor's override.
var terengganuRowPattern = regexp.MustCompile(`(?is)<tr>\s*<td[^>]*>\s*(\d{4})\s*</td>\s*<td[^>]*>\s*([\d,]+\.\d+)\s*</td>\s*</tr>`)

func ParseTerengganuTable(html string) []TerengganuNisabEntry {
	matches := terengganuRowPattern.FindAllStringSubmatch(html, -1)
	entries := make([]TerengganuNisabEntry, 0, len(matches))
	for _, m := range matches {
		year, yearErr := strconv.Atoi(m[1])
		amount, amountErr := strconv.ParseFloat(strings.ReplaceAll(m[2], ",", ""), 64)
		if yearErr == nil && amountErr == nil {
			entries = append(entries, TerengganuNisabEntry{Year: year, Amount: amount})
		}
	}
	return entries
}

// PickCurrentTerengganuEntry picks the current year's row if published,
// else the most recent past year — MAIDAM doesn't always have a row for
// the current year yet. Pure/exported for unit testing.
func PickCurrentTerengganuEntry(entries []TerengganuNisabEntry, now time.Time) *TerengganuNisabEntry {
	year := now.Year()
	var best *TerengganuNisabEntry
	for i := range entries {
		if entries[i].Year == year {
			return &entries[i]
		}
		if entries[i].Year <= year && (best == nil || entries[i].Year > best.Year) {
			best = &entries[i]
		}
	}
	return best
}

func fetchTerengganuNisab(ctx context.Context) (float64, error) {
	html, err := fetchText(ctx, terengganuURL)
	if err != nil {
		return 0, err
	}

	entries := ParseTerengganuTable(html)
	if len(entries) == 0 {
		return 0, fmt.Errorf("couldn't find any year/amount rows in the nisab table")
	}

	current := PickCurrentTerengganuEntry(entries, time.Now())
	if current == nil {
		return 0, fmt.Errorf("no entry found for the current or any past year")
	}
	return current.Amount, nil
}

// Authorities mirrors apps/mobile's STATE_AUTHORITIES — verified live-page
// research (URL + exact anchor text confirmed against the real page, not
// an aggregator, as of 2026-08-29).
var Authorities = []AuthorityConfig{
	{
		State:         "selangor",
		AuthorityName: "Lembaga Zakat Selangor (LZS)",
		URL:           selangorAjaxURL,
		FetchOverride: fetchSelangorNisab,
	},
	{
		State:         "wp_kl_putrajaya_labuan",
		AuthorityName: "Pusat Pungutan Zakat–MAIWP (PPZ-MAIWP)",
		URL:           "https://www.zakat.com.my/info-zakat/jenis-jenis-zakat/zakat-pendapatan/",
		AnchorText:    "nisab 2026",
	},
	{
		State:         "johor",
		AuthorityName: "Majlis Agama Islam Negeri Johor (MAIJ)",
		URL:           "https://www.maij.gov.my/?page_id=110",
		AnchorText:    "kadar nisab zakat semasa terkini",
	},
	{
		State:         "kedah",
		AuthorityName: "Lembaga Zakat Negeri Kedah (LZNK)",
		URL:           "https://www.lznk.com.my/",
		AnchorText:    "nisab taqdiri (emas)",
	},
	{
		State:         "melaka",
		AuthorityName: "Majlis Agama Islam Melaka (MAIM)",
		URL:           "https://www2.izakat.com/ui.php",
		AnchorText:    "nisab semasa",
	},
	{
		State:         "negeri_sembilan",
		AuthorityName: "Majlis Agama Islam Negeri Sembilan (MAINS)",
		URL:           "https://portal.mains.gov.my/",
		AnchorText:    "nisab semasa zakat harta",
	},
	{
		State:         "sabah",
		AuthorityName: "Pusat Zakat Sabah",
		URL:           "http://appszakat.sabah.gov.my/zakat/",
		AnchorText:    "nisab semasa",
	},
	{
		State:         "terengganu",
		AuthorityName: "Majlis Agama Islam dan Adat Istiadat Melayu Terengganu (MAIDAM)",
		URL:           terengganuURL,
		FetchOverride: fetchTerengganuNisab,
	},
}

// ScrapeOne fetches and parses one jurisdiction's live figure.
func ScrapeOne(ctx context.Context, cfg AuthorityConfig) (float64, error) {
	if cfg.FetchOverride != nil {
		return cfg.FetchOverride(ctx)
	}

	html, err := fetchText(ctx, cfg.URL)
	if err != nil {
		return 0, err
	}

	amount, ok := ParseNisabAmount(html, cfg.AnchorText)
	if !ok {
		return 0, fmt.Errorf("anchor text not found on page")
	}
	return amount, nil
}
