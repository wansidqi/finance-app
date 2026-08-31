// Package nisabai serves a per-state zakat nisab figure sourced from Google
// Gemini, cached once per calendar month so every app install shares a
// single monthly Gemini call instead of each device calling Gemini itself
// (never feasible client-side anyway — no key should ship in the app, and
// the app has no server component of its own to hold one).
//
// This is a fallback tier only: apps/mobile's nisab-resolver tries a
// per-state live scrape first (local/nisab-state-sync-service.ts) and only
// reaches this tier for a state that scrape doesn't cover.
package nisabai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go-fiber-app/pkg/db"
	"go-fiber-app/pkg/logger"
	"go-fiber-app/pkg/nisab"
	"net/http"
	"strings"
	"sync"
	"time"
)

const geminiModel = "gemini-2.5-flash"

var geminiEndpoint = fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", geminiModel)

// Grounded search calls run an actual web search before answering — slower
// and more variable than a plain generation call, and observed live to
// sometimes exceed 30s. This is no longer request-latency-sensitive (the
// fetch runs in a background goroutine — see triggerBackgroundRefresh —
// never blocking an actual HTTP response), so a generous timeout only
// costs background completion time, not user-facing latency; better that
// than flagging a merely-slow-but-fine call as a failure.
var httpClient = &http.Client{Timeout: 60 * time.Second}

type StateNisab struct {
	State       string  `json:"state"`
	ZakatAgency string  `json:"zakatAgency,omitempty"`
	NisabRM     float64 `json:"nisabRM"`
	// Customary worn-jewelry exemption threshold in grams (zakat uruf) —
	// some state authorities publish this alongside the harta nisab. Nil
	// when Gemini couldn't find one, since not every state publishes it.
	GoldUrufWornGrams *float64 `json:"goldUrufWornGrams,omitempty"`
	// The URL Gemini's grounded search actually cited for this figure —
	// prompted to prefer the state's own official zakat authority site,
	// falling back to another legitimate source (news, etc.) rather than
	// leaving a state unsourced. Empty when the model couldn't attribute
	// one; nisabstate treats a non-empty SourceURL as this figure's trust
	// signal in place of an independent server-side scrape (see
	// internal/nisabstate — this app no longer scrapes the state sites
	// itself, it relies entirely on Gemini including a real citation).
	SourceURL string `json:"sourceUrl,omitempty"`
	AsOf      string `json:"asOf"`
}

type Result struct {
	States      []StateNisab `json:"states"`
	CachedMonth string       `json:"cachedMonth"`
}

// Service holds the one piece of config this package needs (the Gemini
// API key) — constructed once in the router and handed to the controller,
// same shape as the other internal/* modules' Service.
type Service struct {
	apiKey string
}

func NewService(apiKey string) *Service {
	return &Service{apiKey: apiKey}
}

func monthKey(t time.Time) string {
	return t.UTC().Format("2006-01")
}

// GetStateNisab returns this month's cached per-state nisab figures. When
// nothing is cached for the current month yet, it kicks off a background
// refresh (see triggerBackgroundRefresh) and immediately serves the most
// recently cached month's data instead — a synchronous Gemini call here can
// take 20-30+ seconds (two sequential API calls, one of them a real web
// search), and no single request should have to wait on that just because
// it happened to land right as the cache went stale. Only a brand-new
// deployment with zero cache ever returns an empty result — the caller
// (controller) turns that into a 200 with an empty states list rather than
// an error, so the app's fallback tier just treats it as "nothing
// available yet" and moves on.
func (s *Service) GetStateNisab() Result {
	month := monthKey(time.Now())

	if cached, ok := cacheGet(month); ok {
		return cached
	}

	s.triggerBackgroundRefresh(month)

	if cached, ok := cacheGetLatest(); ok {
		return cached
	}
	return Result{States: nil, CachedMonth: ""}
}

var (
	refreshMu       sync.Mutex
	refreshInFlight bool
)

// triggerBackgroundRefresh starts an async Gemini fetch for `month` if one
// isn't already running, and returns immediately either way — see
// GetStateNisab for why this can't be synchronous. `refreshInFlight`
// prevents piling up duplicate concurrent Gemini calls if several requests
// land while a refresh is already in progress.
func (s *Service) triggerBackgroundRefresh(month string) {
	if s.apiKey == "" || breakerOpen() {
		return
	}

	refreshMu.Lock()
	if refreshInFlight {
		refreshMu.Unlock()
		return
	}
	refreshInFlight = true
	refreshMu.Unlock()

	go func() {
		defer func() {
			refreshMu.Lock()
			refreshInFlight = false
			refreshMu.Unlock()
		}()

		fetched, err := s.fetchFromGemini()
		if err != nil {
			recordFailure()
			if logger.ErrorLogger != nil {
				logger.ErrorLogger.Printf("nisabai: Gemini fetch for %s failed, falling back to last cached month: %v", month, err)
			}
			return
		}
		recordSuccess()
		cacheSet(month, fetched)
	}()
}

// --- Gemini call ---

type geminiRequest struct {
	Contents         []geminiContent  `json:"contents"`
	Tools            []geminiTool     `json:"tools,omitempty"`
	GenerationConfig *geminiGenConfig `json:"generationConfig,omitempty"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

// geminiTool enables Gemini's web-search grounding (the same mechanism
// behind Google's AI Overview) so answers come from a live search instead
// of the model's static training data. The API rejects combining this with
// GenerationConfig's structured-output mode in the same call (tested
// directly: "Tool use with a response mime type: 'application/json' is
// unsupported") — hence the two-stage fetchFromGemini below: a grounded
// free-text call, then a separate non-grounded call to reshape that text
// into the JSON schema this endpoint needs.
type geminiTool struct {
	GoogleSearch struct{} `json:"google_search"`
}

type geminiGenConfig struct {
	// Zero temperature (most deterministic) for both stages: stage 1's
	// grounded search was verified live to sometimes come back lazier/less
	// thorough on a given call (search + reasoning is inherently variable),
	// and stage 2 is a pure extraction task with no need for creativity
	// either way — determinism only helps a figure that gets cached and
	// trusted for a whole month.
	Temperature      float64       `json:"temperature"`
	ResponseMimeType string        `json:"responseMimeType,omitempty"`
	ResponseSchema   *geminiSchema `json:"responseSchema,omitempty"`
}

// geminiSchema is a small subset of the OpenAPI-style schema Gemini's
// structured-output mode accepts — just enough to force back an array of
// {state, nisabRM} objects instead of free-form prose we'd have to regex.
type geminiSchema struct {
	Type       string                  `json:"type"`
	Properties map[string]geminiSchema `json:"properties,omitempty"`
	Items      *geminiSchema           `json:"items,omitempty"`
	Required   []string                `json:"required,omitempty"`
}

var responseSchema = geminiSchema{
	Type: "OBJECT",
	Properties: map[string]geminiSchema{
		"states": {
			Type: "ARRAY",
			Items: &geminiSchema{
				Type: "OBJECT",
				Properties: map[string]geminiSchema{
					"state":             {Type: "STRING"},
					"zakatAgency":       {Type: "STRING"},
					"nisabRM":           {Type: "NUMBER"},
					"goldUrufWornGrams": {Type: "NUMBER"},
					"sourceUrl":         {Type: "STRING"},
				},
				Required: []string{"state", "nisabRM"},
			},
		},
	},
	Required: []string{"states"},
}

// buildSearchPrompt is stage 1: a grounded search for every state's own
// officially published figure — deliberately not asking the model to just
// compute 85g-of-gold itself, which is what produced an identical flat
// number for all 14 states before grounding was added (verified against a
// live call). An earlier, more rigid version of this prompt itemized all 14
// state names, demanded one line per state, and told the model to say
// UNKNOWN rather than guess — that actually backfired: it made the model
// omit half the states entirely rather than search harder for them. This
// simpler direct phrasing (closer to just asking Google Search the
// question) was verified against a live call to search noticeably harder
// per state (40+ distinct webSearchQueries logged in one response,
// literally "nisab zakat <state> 2026 harta" for each) and returned all 14
// states, with every figure that overlapped the old prompt's output
// matching it exactly — so it's strictly better, not just simpler. Still
// explicitly scopes to zakat harta (property/wealth), since a same-page
// "zakat" figure of the wrong kind is a real risk (this is exactly why
// several states are deliberately left out of
// local/nisab-state-sync-service.ts's live scraper — e.g. Pulau Pinang's
// only findable figure there was an income-zakat page, not zakat harta) —
// but that constraint alone doesn't seem to cause the same omission problem
// the itemized/UNKNOWN version did (verified live: the model self-labeled
// every entry "Zakat Harta" / "Nisab Taqdiri (Emas)" unprompted).
func buildSearchPrompt() string {
	return "List down all nisab zakat for all 14 states in Malaysia in JSON format. For each state, give the current official " +
		"zakat harta (property/wealth) nisab threshold in Malaysian Ringgit (RM), as published by that state's own official " +
		"zakat authority — not zakat fitrah, zakat pendapatan (income), zakat perniagaan (business), or any other zakat type. " +
		"Also include the name of that state's zakat authority/agency, and — only if that same authority publishes it — the " +
		"customary worn-jewelry exemption threshold in grams (zakat emas uruf/dipakai), leaving it out for a state if no such figure is published. " +
		"For each state also give the exact URL of the page you found this figure on. Prefer that state's own official zakat authority " +
		"website as the source; only if you can't find the figure on the official site, use another legitimate source instead (e.g. a " +
		"reputable news article reporting the official figure) rather than leaving the state unsourced."
}

// buildReformatPrompt is stage 2: a plain (non-grounded) call that only
// extracts structured data out of stage 1's already-grounded text — an
// extraction task, not a knowledge task, so it doesn't need search access
// itself and can safely use the strict JSON schema mode that grounding
// can't be combined with.
func buildReformatPrompt(groundedText string) string {
	var labels []string
	for _, key := range StateKeys {
		labels = append(labels, fmt.Sprintf("%s (key: %q)", stateLabels[key], key))
	}
	return "Convert the following notes into structured data. For each of these states, find its line in the notes below and output: " +
		"its exact key; the zakat agency/authority name mentioned for it, if any; the RM amount as a plain number (no currency symbol, no commas); " +
		"the gold uruf/worn-jewelry exemption in grams as a plain number, only if the notes actually mention one for that state; " +
		"and the source URL the notes cite for that state's figure, if any. " +
		"States: " + strings.Join(labels, "; ") + ". " +
		"Only include a state in the output if the notes give it a specific numeric RM figure — if the notes say UNKNOWN, unclear, or don't mention a state at all, omit that state from the output entirely rather than inventing a number for it.\n\n" +
		"Notes:\n" + groundedText
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

type geminiParsedStateEntry struct {
	State             string  `json:"state"`
	ZakatAgency       string  `json:"zakatAgency"`
	NisabRM           float64 `json:"nisabRM"`
	GoldUrufWornGrams float64 `json:"goldUrufWornGrams"`
	SourceURL         string  `json:"sourceUrl"`
}

type geminiParsedBody struct {
	States []geminiParsedStateEntry `json:"states"`
}

// fetchFromGemini runs the two-stage call described on geminiTool: a
// grounded web search for the real per-state figures, then a plain
// extraction call to shape that text into the schema this endpoint returns.
func (s *Service) fetchFromGemini() ([]StateNisab, error) {
	groundedText, err := s.callGemini(geminiRequest{
		Contents:         []geminiContent{{Parts: []geminiPart{{Text: buildSearchPrompt()}}}},
		Tools:            []geminiTool{{}},
		GenerationConfig: &geminiGenConfig{Temperature: 0},
	})
	if err != nil {
		return nil, fmt.Errorf("grounded search call failed: %w", err)
	}

	reformattedText, err := s.callGemini(geminiRequest{
		Contents: []geminiContent{{Parts: []geminiPart{{Text: buildReformatPrompt(groundedText)}}}},
		GenerationConfig: &geminiGenConfig{
			Temperature:      0,
			ResponseMimeType: "application/json",
			ResponseSchema:   &responseSchema,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("reformat call failed: %w", err)
	}

	states, err := parseGeminiText(reformattedText)
	if err != nil {
		return nil, err
	}

	states = dropImplausible(states, nisab.Value())
	if len(states) == 0 {
		return nil, fmt.Errorf("no state figures survived the plausibility check")
	}
	if looksGenericallyFlat(states) {
		// Real per-state figures vary substantially (verified live: a good
		// run ranged ~RM26k-46k) because each state authority publishes
		// independently, on its own schedule, from its own gold-price
		// snapshot. A batch this tightly clustered is the exact signature
		// of the bug this whole guard exists for: the grounded search call
		// coming back lazy and just recomputing one generic 85g-gold figure
		// for every state instead of finding each state's real one
		// (reproduced and confirmed live during development). Treating it
		// as a failure — falling back to the last good cached month — is
		// safer than caching a suspect batch for a whole month.
		return nil, fmt.Errorf("state figures look suspiciously uniform, discarding as unreliable")
	}

	return states, nil
}

// dropImplausible discards any state figure too far from the live,
// always-available nationwide gold-price nisab (pkg/nisab.Value(), same
// 85g-of-gold basis every state's own figure is ultimately derived from) —
// real state-to-state variation is timing/methodology differences, not
// multiples, so anything outside a generous 0.5x-3x band is more likely a
// parsing slip or a hallucinated figure than a real published rate. `reference`
// is passed in (rather than calling nisab.Value() here) so this stays a pure,
// network-free function to unit test.
func dropImplausible(states []StateNisab, reference float64) []StateNisab {
	if reference <= 0 {
		return states
	}

	kept := make([]StateNisab, 0, len(states))
	for _, s := range states {
		ratio := s.NisabRM / reference
		if ratio < 0.5 || ratio > 3.0 {
			continue
		}
		kept = append(kept, s)
	}
	return kept
}

// looksGenericallyFlat flags a batch where every state landed suspiciously
// close together — see the comment where this is called. Threshold picked
// from two live-verified reference points: a good run's spread was
// RM25,995.67-45,825.48 (ratio ~1.76); a bad run reproduced during
// development (grounded search came back generic instead of per-state) was
// RM22,669.53-29,376.08 (ratio ~1.30) — 1.3 as the cutoff catches the
// reproduced bad case while clearing the verified-good one.
func looksGenericallyFlat(states []StateNisab) bool {
	if len(states) < 6 {
		return false
	}

	min, max := states[0].NisabRM, states[0].NisabRM
	for _, s := range states {
		if s.NisabRM < min {
			min = s.NisabRM
		}
		if s.NisabRM > max {
			max = s.NisabRM
		}
	}
	return min > 0 && max/min < 1.3
}

// callGemini issues one generateContent request and returns the first
// candidate's text, shared by both stages of fetchFromGemini.
func (s *Service) callGemini(reqBody geminiRequest) (string, error) {
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest(http.MethodPost, geminiEndpoint, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", s.apiKey)

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("gemini api returned status %d", resp.StatusCode)
	}

	var body geminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", err
	}
	if len(body.Candidates) == 0 || len(body.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini response had no candidates")
	}

	return body.Candidates[0].Content.Parts[0].Text, nil
}

// parseGeminiText decodes the structured-output JSON text Gemini returns
// (guaranteed valid JSON matching responseSchema, but still just a string
// in the API envelope) and stamps each entry with the current month. Pure
// so it's unit-testable without a live API call.
func parseGeminiText(text string) ([]StateNisab, error) {
	var parsed geminiParsedBody
	if err := json.Unmarshal([]byte(text), &parsed); err != nil {
		return nil, fmt.Errorf("couldn't parse gemini response as JSON: %w", err)
	}
	if len(parsed.States) == 0 {
		return nil, fmt.Errorf("gemini response contained no states")
	}

	asOf := monthKey(time.Now())
	states := make([]StateNisab, 0, len(parsed.States))
	for _, entry := range parsed.States {
		if entry.State == "" || entry.NisabRM <= 0 {
			continue
		}
		var uruf *float64
		if entry.GoldUrufWornGrams > 0 {
			v := entry.GoldUrufWornGrams
			uruf = &v
		}
		states = append(states, StateNisab{
			State:             entry.State,
			ZakatAgency:       entry.ZakatAgency,
			NisabRM:           entry.NisabRM,
			GoldUrufWornGrams: uruf,
			SourceURL:         entry.SourceURL,
			AsOf:              asOf,
		})
	}
	if len(states) == 0 {
		return nil, fmt.Errorf("gemini response had no usable state entries")
	}
	return states, nil
}

// --- SQLite cache ---

type aiCacheRow struct {
	State             string   `db:"state"`
	ZakatAgency       *string  `db:"zakat_agency"`
	NisabRM           float64  `db:"nisab_rm"`
	GoldUrufWornGrams *float64 `db:"gold_uruf_worn_grams"`
	SourceURL         *string  `db:"source_url"`
}

func cacheGet(month string) (Result, bool) {
	var rows []aiCacheRow
	if err := db.GetDB().Select(&rows, `SELECT state, zakat_agency, nisab_rm, gold_uruf_worn_grams, source_url FROM nisab_ai_cache WHERE cached_month = ?`, month); err != nil || len(rows) == 0 {
		return Result{}, false
	}

	states := make([]StateNisab, 0, len(rows))
	for _, r := range rows {
		agency := ""
		if r.ZakatAgency != nil {
			agency = *r.ZakatAgency
		}
		sourceURL := ""
		if r.SourceURL != nil {
			sourceURL = *r.SourceURL
		}
		states = append(states, StateNisab{
			State:             r.State,
			ZakatAgency:       agency,
			NisabRM:           r.NisabRM,
			GoldUrufWornGrams: r.GoldUrufWornGrams,
			SourceURL:         sourceURL,
			AsOf:              month,
		})
	}
	return Result{States: states, CachedMonth: month}, true
}

// cacheGetLatest returns the most recently cached month's data, regardless
// of whether it's the current month — used when a fresh Gemini call fails
// (or the key is unset) so the fallback tier still has *something* rather
// than nothing, as long as any month was ever successfully cached.
func cacheGetLatest() (Result, bool) {
	var latestMonth string
	if err := db.GetDB().Get(&latestMonth, `SELECT MAX(cached_month) FROM nisab_ai_cache`); err != nil || latestMonth == "" {
		return Result{}, false
	}
	return cacheGet(latestMonth)
}

func cacheSet(month string, states []StateNisab) {
	for _, s := range states {
		var agency *string
		if s.ZakatAgency != "" {
			agency = &s.ZakatAgency
		}
		var sourceURL *string
		if s.SourceURL != "" {
			sourceURL = &s.SourceURL
		}
		_, _ = db.GetDB().Exec(
			`INSERT INTO nisab_ai_cache (state, cached_month, zakat_agency, nisab_rm, gold_uruf_worn_grams, source_url)
			 VALUES (?, ?, ?, ?, ?, ?)
			 ON CONFLICT(state, cached_month) DO UPDATE SET
			   zakat_agency = excluded.zakat_agency,
			   nisab_rm = excluded.nisab_rm,
			   gold_uruf_worn_grams = excluded.gold_uruf_worn_grams,
			   source_url = excluded.source_url`,
			s.State, month, agency, s.NisabRM, s.GoldUrufWornGrams, sourceURL,
		)
	}
}

// --- Circuit breaker ---
//
// Same pattern as pkg/nisab: bounds worst-case latency on a Gemini outage
// instead of retrying every single request.
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
