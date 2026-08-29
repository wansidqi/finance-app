import { resolveNisab } from "@/local/nisab-resolver";
import { shouldRunScheduledStateSync, syncAllStates } from "@/local/nisab-state-sync-service";
import { detectAndStoreLocation, getStoredLocation } from "@/local/state-location-service";
import { notifyIfNisabChanged } from "@/services/nisab-notifications";
import { useEffect, useRef } from "react";

/**
 * Runs the per-state nisab detection/sync app-wide on every cold launch,
 * independent of whether the user ever opens the Zakat Tracker tab —
 * mirrors `ZakatReminderSync`'s rationale. Location detection itself only
 * ever runs once automatically (first launch with no stored location);
 * after that it's a foreground, user-initiated action from the Zakat
 * Tracker screen (e.g. after moving states), same as the OS never
 * re-prompting for a permission it already has an answer for.
 */
export function StateNisabSync() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const existing = await getStoredLocation();
      if (!existing) {
        await detectAndStoreLocation();
      }

      if (await shouldRunScheduledStateSync()) {
        await syncAllStates();
      }

      const resolved = await resolveNisab();
      await notifyIfNisabChanged(resolved);
    })().catch((err) => console.warn("State nisab sync failed", err));
  }, []);

  return null;
}
