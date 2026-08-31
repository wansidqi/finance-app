// Persistence layer — the only file in this feature that talks to KV
// directly. Simpler than the Go v1 backend's SQLite month-keyed cache
// table: KV just holds "the last successfully fetched value per state,"
// full stop. A new successful refresh overwrites it; a failed refresh
// leaves the existing value untouched. There's no cache-staleness check
// here either — the refresh cadence is driven entirely by the Cron Trigger
// (see wrangler.toml) via nisab.service.ts, not by "is this read stale," so
// reads never need to reason about staleness.
import { STATE_KEYS, type StateKey } from "./nisab.states.js";

export interface StateNisab {
  state: string;
  zakatAgency: string;
  nisabRM: number;
  goldUrufWornGrams: number | null;
  sourceUrl: string;
  asOf: string;
}

const STATE_KEY_PREFIX = "nisab:state:";
const LAST_REFRESHED_MONTH_KEY = "nisab:meta:lastRefreshedMonth";

export async function getAllCachedStates(kv: KVNamespace): Promise<StateNisab[]> {
  const results = await Promise.all(
    STATE_KEYS.map(async (key) => {
      const raw = await kv.get(STATE_KEY_PREFIX + key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as StateNisab;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((s): s is StateNisab => s !== null);
}

export async function setCachedState(kv: KVNamespace, state: StateKey, value: StateNisab): Promise<void> {
  await kv.put(STATE_KEY_PREFIX + state, JSON.stringify(value));
}

export async function setCachedStates(kv: KVNamespace, states: StateNisab[]): Promise<void> {
  await Promise.all(
    states
      .filter((s): s is StateNisab & { state: StateKey } => (STATE_KEYS as readonly string[]).includes(s.state))
      .map((s) => setCachedState(kv, s.state as StateKey, s)),
  );
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

/** True unless a refresh has already completed for the current calendar month — guards against the Cron Trigger firing more than once, or a manual re-trigger, forcing a redundant Gemini call in the same month. */
export async function isRefreshDueThisMonth(kv: KVNamespace): Promise<boolean> {
  const lastRefreshedMonth = await kv.get(LAST_REFRESHED_MONTH_KEY);
  return lastRefreshedMonth !== currentMonthKey();
}

export async function markRefreshedThisMonth(kv: KVNamespace): Promise<void> {
  await kv.put(LAST_REFRESHED_MONTH_KEY, currentMonthKey());
}
