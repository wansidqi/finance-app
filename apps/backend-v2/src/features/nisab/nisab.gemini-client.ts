// Client for the two-stage Gemini call this feature depends on — kept
// separate from nisab.service.ts so the service stays about *orchestration*
// (when to refresh, what to do with the result) while this file owns the
// mechanics of talking to Gemini (prompts, request shape, guards on its
// output). Port of apps/backend's internal/nisabai (Go v1 backend); keep in
// sync if that changes. The Go backend stays the system of record for now
// (see wrangler.toml's cron comment), this is the edge-deployable rewrite.
import { STATE_KEYS, STATE_LABELS } from "./nisab.states.js";
import type { StateNisab } from "./nisab.model.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Grounded search calls run an actual web search before answering — slower
// and more variable than a plain generation call, observed live to
// sometimes exceed 90s under heavy API load. This runs from a scheduled
// Worker (cron) or an authenticated manual trigger, never the public
// request hot path, so a generous timeout only costs background completion
// time, not user-facing latency.
const FETCH_TIMEOUT_MS = 90_000;

// --- Prompts ---

/**
 * Stage 1: a grounded search for every state's own officially published
 * figure — deliberately not asking the model to just compute 85g-of-gold
 * itself, which produced an identical flat number for all 14 states before
 * grounding was added (verified live in the Go backend's development).
 * Explicitly scopes to zakat harta (property/wealth), and asks for a
 * source URL, preferring the state's own official site and falling back to
 * another legitimate source (e.g. news) rather than leaving a state
 * unsourced — see nisab.service.ts's isScraped derivation for why: this
 * app doesn't scrape state sites independently, trust is signaled by
 * whether Gemini cited a real source.
 */
export function buildSearchPrompt(): string {
  return (
    "List down all nisab zakat for all 14 states in Malaysia in JSON format. For each state, give the current official " +
    "zakat harta (property/wealth) nisab threshold in Malaysian Ringgit (RM), as published by that state's own official " +
    "zakat authority — not zakat fitrah, zakat pendapatan (income), zakat perniagaan (business), or any other zakat type. " +
    "Also include the name of that state's zakat authority/agency, and — only if that same authority publishes it — the " +
    "customary worn-jewelry exemption threshold in grams (zakat emas uruf/dipakai), leaving it out for a state if no such figure is published. " +
    "For each state also give the exact URL of the page you found this figure on. Prefer that state's own official zakat authority " +
    "website as the source; only if you can't find the figure on the official site, use another legitimate source instead (e.g. a " +
    "reputable news article reporting the official figure) rather than leaving the state unsourced."
  );
}

/**
 * Stage 2: a plain (non-grounded) call that only extracts structured data
 * out of stage 1's already-grounded text — an extraction task, not a
 * knowledge task, so it can safely use strict JSON schema mode (Gemini's
 * API rejects combining search grounding with structured-output mode in
 * the same call, confirmed directly against the live API).
 */
export function buildReformatPrompt(groundedText: string): string {
  const labels = STATE_KEYS.map((key) => `${STATE_LABELS[key]} (key: "${key}")`).join("; ");
  return (
    "Convert the following notes into structured data. For each of these states, find its line in the notes below and output: " +
    "its exact key; the zakat agency/authority name mentioned for it, if any; the RM amount as a plain number (no currency symbol, no commas); " +
    "the gold uruf/worn-jewelry exemption in grams as a plain number, only if the notes actually mention one for that state; " +
    "and the source URL the notes cite for that state's figure, if any. " +
    `States: ${labels}. ` +
    "Only include a state in the output if the notes give it a specific numeric RM figure — if the notes say UNKNOWN, unclear, or don't mention a state at all, omit that state from the output entirely rather than inventing a number for it.\n\n" +
    `Notes:\n${groundedText}`
  );
}

// --- Gemini API plumbing ---

interface GeminiSchema {
  type: string;
  properties?: Record<string, GeminiSchema>;
  items?: GeminiSchema;
  required?: string[];
}

const RESPONSE_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    states: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          state: { type: "STRING" },
          zakatAgency: { type: "STRING" },
          nisabRM: { type: "NUMBER" },
          goldUrufWornGrams: { type: "NUMBER" },
          sourceUrl: { type: "STRING" },
        },
        required: ["state", "nisabRM"],
      },
    },
  },
  required: ["states"],
};

interface GeminiRequestBody {
  contents: { parts: { text: string }[] }[];
  tools?: { google_search: Record<string, never> }[];
  generationConfig: {
    temperature: number;
    responseMimeType?: string;
    responseSchema?: GeminiSchema;
  };
}

interface GeminiResponseBody {
  candidates?: { content: { parts: { text: string }[] } }[];
}

async function callGemini(apiKey: string, body: GeminiRequestBody): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`gemini api returned status ${resp.status}`);
    }
    const parsed = (await resp.json()) as GeminiResponseBody;
    const text = parsed.candidates?.[0]?.content.parts?.[0]?.text;
    if (!text) throw new Error("gemini response had no candidates");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

interface GeminiParsedStateEntry {
  state?: string;
  zakatAgency?: string;
  nisabRM?: number;
  goldUrufWornGrams?: number;
  sourceUrl?: string;
}

/** Decodes the structured-output JSON text Gemini returns and stamps each entry with the current month. Pure so it's unit-testable without a live API call. */
export function parseGeminiText(text: string, asOf: string): StateNisab[] {
  let parsed: { states?: GeminiParsedStateEntry[] };
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`couldn't parse gemini response as JSON: ${(err as Error).message}`);
  }
  if (!parsed.states || parsed.states.length === 0) {
    throw new Error("gemini response contained no states");
  }

  const states: StateNisab[] = [];
  for (const entry of parsed.states) {
    if (!entry.state || !entry.nisabRM || entry.nisabRM <= 0) continue;
    states.push({
      state: entry.state,
      zakatAgency: entry.zakatAgency ?? "",
      nisabRM: entry.nisabRM,
      goldUrufWornGrams: entry.goldUrufWornGrams && entry.goldUrufWornGrams > 0 ? entry.goldUrufWornGrams : null,
      sourceUrl: entry.sourceUrl ?? "",
      asOf,
    });
  }
  if (states.length === 0) {
    throw new Error("gemini response had no usable state entries");
  }
  return states;
}

/**
 * Discards any state figure too far from the live, always-available
 * nationwide gold-price nisab (same 85g-of-gold basis every state's own
 * figure is ultimately derived from) — real state-to-state variation is
 * timing/methodology differences, not multiples, so anything outside a
 * generous 0.5x-3x band is more likely a parsing slip or a hallucinated
 * figure than a real published rate. `reference` is null when BNM was
 * unreachable — in that case this is a no-op rather than blocking a
 * refresh on an unrelated live-fetch failing.
 */
export function dropImplausible(states: StateNisab[], reference: number | null): StateNisab[] {
  if (reference === null || reference <= 0) return states;
  return states.filter((s) => {
    const ratio = s.nisabRM / reference;
    return ratio >= 0.5 && ratio <= 3.0;
  });
}

/**
 * Flags a batch where every state landed suspiciously close together —
 * the signature of the grounded search coming back generic (recomputing
 * one 85g-gold figure for every state) instead of doing real per-state
 * research. Threshold picked from the same live-verified reference points
 * as the Go backend: a good run's spread was ~1.76x; a reproduced bad run
 * was ~1.30x — 1.3 as the cutoff catches the bad case while clearing the
 * good one. NOTE: verified live (this session) that even a genuinely
 * grounded, per-state-researched batch can still fail this way for a
 * *subset* of states while the overall min/max spread stays above 1.3 —
 * this guard catches the original failure mode, not every failure mode.
 */
export function looksGenericallyFlat(states: StateNisab[]): boolean {
  if (states.length < 6) return false;
  const values = states.map((s) => s.nisabRM);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min > 0 && max / min < 1.3;
}

/** Runs the full two-stage fetch + both guards. Throws on any failure — nisab.service.ts catches, logs, and falls back to the last-good cache. */
export async function fetchNisabFromGemini(apiKey: string, referenceNisab: number | null): Promise<StateNisab[]> {
  const groundedText = await callGemini(apiKey, {
    contents: [{ parts: [{ text: buildSearchPrompt() }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0 },
  });

  const reformattedText = await callGemini(apiKey, {
    contents: [{ parts: [{ text: buildReformatPrompt(groundedText) }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  });

  const asOf = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  let states = parseGeminiText(reformattedText, asOf);

  states = dropImplausible(states, referenceNisab);
  if (states.length === 0) {
    throw new Error("no state figures survived the plausibility check");
  }
  if (looksGenericallyFlat(states)) {
    throw new Error("state figures look suspiciously uniform, discarding as unreliable");
  }

  return states;
}
