// Business logic for the nisab feature — orchestrates the model (KV) and
// the Gemini client, and owns the domain rule for what counts as "trusted"
// (isScraped). No req/res objects here; nisab.controller.ts is the only
// file in this feature that touches HTTP.
import { fetchReferenceNisab } from "./nisab.bnm-reference.js";
import { fetchNisabFromGemini } from "./nisab.gemini-client.js";
import { getAllCachedStates, isRefreshDueThisMonth, markRefreshedThisMonth, setCachedStates } from "./nisab.model.js";
import { STATE_LABELS, type StateKey } from "./nisab.states.js";
import type { Env } from "../../shared/env.js";

export interface NisabStateView {
  state: string;
  zakatAgency: string;
  nisabRM: number;
  goldUrufWornGrams: number | null;
  sourceUrl: string;
  // Trust signal: whether Gemini's grounded search cited a real source for
  // this figure (see nisab.gemini-client.ts's buildSearchPrompt) — this app
  // doesn't scrape state sites independently, so "isScraped" here really
  // means "has an attributed source," kept as this name for wire
  // compatibility with what apps/mobile already consumes from the Go v1
  // backend.
  isScraped: boolean;
  asOf: string;
}

/** Every jurisdiction currently cached, shaped for the API response — a jurisdiction with no cached figure is simply omitted, same "degrade gracefully" rule apps/mobile's own resolver follows (it falls further back to PPZ, then "unavailable"). */
export async function getAllStates(kv: KVNamespace): Promise<NisabStateView[]> {
  const cached = await getAllCachedStates(kv);
  return cached.map((entry) => ({
    state: entry.state,
    zakatAgency: entry.zakatAgency || STATE_LABELS[entry.state as StateKey] || entry.state,
    nisabRM: entry.nisabRM,
    goldUrufWornGrams: entry.goldUrufWornGrams,
    sourceUrl: entry.sourceUrl,
    isScraped: entry.sourceUrl !== "",
    asOf: entry.asOf,
  }));
}

export interface RefreshResult {
  ran: boolean;
  reason: string;
  statesUpdated?: number;
}

/** Refreshes the nisab cache if due this month. `force` skips the due-check — used by the authenticated manual-trigger route, never by the scheduled (cron) path itself. */
export async function refreshNisabCache(env: Env, force = false): Promise<RefreshResult> {
  if (!force && !(await isRefreshDueThisMonth(env.NISAB_CACHE))) {
    return { ran: false, reason: "already refreshed this month" };
  }
  if (!env.GOOGLE_AI_API_KEY) {
    return { ran: false, reason: "GOOGLE_AI_API_KEY is not configured" };
  }

  const referenceNisab = await fetchReferenceNisab();
  const states = await fetchNisabFromGemini(env.GOOGLE_AI_API_KEY, referenceNisab);

  await setCachedStates(env.NISAB_CACHE, states);
  await markRefreshedThisMonth(env.NISAB_CACHE);

  return { ran: true, reason: "refreshed", statesUpdated: states.length };
}
