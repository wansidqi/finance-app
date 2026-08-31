import { MalaysiaStateKey, NisabSource } from "@/interface/nisab-state";
import { getDb } from "./db";
import { getAllStateNisabRates } from "./nisab-state-sync-service";
import { getStoredLocation } from "./state-location-service";

export interface ResolvedNisab {
  /** Null when no real source (state, AI-with-citation, or PPZ) had a figure — deliberately no computed fallback stands in for one, see NisabSource's "unavailable" kind. */
  nisabRM: number | null;
  source: NisabSource;
}

const PPZ_STATE_KEY: MalaysiaStateKey = "wp_kl_putrajaya_labuan";

/**
 * Two-tier fallback, both backed by one request to apps/backend
 * (local/nisab-state-sync-service.ts): (1) the user's own detected state's
 * figure, whether it's AI-with-a-cited-source or not — apps/backend already
 * resolved which source wins for that state, this just reads its
 * `isScraped` tag to label it; (2) PPZ-MAIWP's published rate as a generic
 * stand-in for a user whose own state has none, still a real
 * officially-cited figure so a better default than nothing. When neither is
 * available, this deliberately returns `nisabRM: null` rather than falling
 * back to a computed nationwide gold-price nisab — showing a specific-looking
 * number that isn't actually from any real source was judged more confusing
 * than surfacing "unavailable" and letting the UI show a placeholder.
 */
export async function resolveNisab(): Promise<ResolvedNisab> {
  const location = await getStoredLocation();
  const rates = await getAllStateNisabRates();

  if (location?.state) {
    const stateRate = rates.find((r) => r.state === location.state);
    if (stateRate) {
      return {
        nisabRM: stateRate.nisabRM,
        source: stateRate.isScraped
          ? { kind: "state", state: location.state, sourceUrl: stateRate.sourceUrl, asOf: stateRate.asOf }
          : { kind: "ai_fallback", state: location.state, asOf: stateRate.asOf },
      };
    }
  }

  const ppzRate = rates.find((r) => r.state === PPZ_STATE_KEY);
  if (ppzRate) {
    return {
      nisabRM: ppzRate.nisabRM,
      source: { kind: "ppz_fallback", sourceUrl: ppzRate.sourceUrl, asOf: ppzRate.asOf },
    };
  }

  return { nisabRM: null, source: { kind: "unavailable" } };
}

interface LastNotifiedRow {
  last_notified_nisab_rm: number | null;
  last_notified_source_kind: string | null;
  last_notified_source_state: string | null;
}

export interface LastNotifiedNisab {
  nisabRM: number;
  sourceKind: NisabSource["kind"];
  sourceState: MalaysiaStateKey | null;
}

/** What the user was last notified their nisab was — lets a global sync tell "nothing changed" from "this is new" without re-alerting on every periodic check. */
export async function getLastNotifiedNisab(): Promise<LastNotifiedNisab | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LastNotifiedRow>(
    "SELECT last_notified_nisab_rm, last_notified_source_kind, last_notified_source_state FROM nisab_state_sync_state WHERE id = 1",
  );
  if (!row || row.last_notified_nisab_rm === null || row.last_notified_source_kind === null) return null;

  return {
    nisabRM: row.last_notified_nisab_rm,
    sourceKind: row.last_notified_source_kind as NisabSource["kind"],
    sourceState: row.last_notified_source_state as MalaysiaStateKey | null,
  };
}

export async function recordNotifiedNisab(resolved: ResolvedNisab): Promise<void> {
  const db = await getDb();
  const sourceState =
    resolved.source.kind === "state" || resolved.source.kind === "ai_fallback" ? resolved.source.state : null;
  await db.runAsync(
    `INSERT INTO nisab_state_sync_state (id, last_notified_nisab_rm, last_notified_source_kind, last_notified_source_state)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_notified_nisab_rm = excluded.last_notified_nisab_rm,
       last_notified_source_kind = excluded.last_notified_source_kind,
       last_notified_source_state = excluded.last_notified_source_state`,
    resolved.nisabRM,
    resolved.source.kind,
    sourceState,
  );
}
