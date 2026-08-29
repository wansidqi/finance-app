import { MalaysiaStateKey, NisabSource } from "@/interface/nisab-state";
import { getDb } from "./db";
import { getStateNisab } from "./nisab-state-sync-service";
import { value as goldPriceNisabValue } from "./nisab";
import { getStoredLocation } from "./state-location-service";

export interface ResolvedNisab {
  nisabRM: number;
  source: NisabSource;
}

const PPZ_STATE_KEY: MalaysiaStateKey = "wp_kl_putrajaya_labuan";

/**
 * Three-tier fallback: (1) the user's own detected state's officially
 * published nisab, when both the state is known and it has a
 * successfully-scraped rate cached; (2) PPZ-MAIWP's published rate as a
 * generic stand-in — it's a real, officially-cited figure, so it's a better
 * default than our own computed one for any user whose own state has no
 * live source (unconfigured, unmatched location, or currently failing);
 * (3) the nationwide gold-price-derived nisab, which is always a fiqh-valid
 * nisab on its own and never depends on any of these sources being reachable.
 */
export async function resolveNisab(): Promise<ResolvedNisab> {
  const location = await getStoredLocation();

  if (location?.state) {
    const stateRate = await getStateNisab(location.state);
    if (stateRate) {
      return {
        nisabRM: stateRate.nisabRM,
        source: { kind: "state", state: location.state, sourceUrl: stateRate.sourceUrl, asOf: stateRate.lastCheckedAt },
      };
    }
  }

  const ppzRate = await getStateNisab(PPZ_STATE_KEY);
  if (ppzRate) {
    return {
      nisabRM: ppzRate.nisabRM,
      source: { kind: "ppz_fallback", sourceUrl: ppzRate.sourceUrl, asOf: ppzRate.lastCheckedAt },
    };
  }

  return { nisabRM: await goldPriceNisabValue(), source: { kind: "gold_price" } };
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
  const sourceState = resolved.source.kind === "state" ? resolved.source.state : null;
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
