import { MALAYSIA_STATE_LABELS } from "@/interface/nisab-state";
import { getLastNotifiedNisab, recordNotifiedNisab, ResolvedNisab } from "@/local/nisab-resolver";
import * as Notifications from "expo-notifications";
import { ensureAndroidChannel, ensureNotificationPermissions } from "./notifications-core";

const ANDROID_CHANNEL_ID = "zakat-nisab-updates";
const NOTIFICATION_IDENTIFIER = "zakat-nisab-updated";

async function ensureChannel() {
  await ensureAndroidChannel({ id: ANDROID_CHANNEL_ID, name: "Zakat Nisab Updates", color: "#10b981" });
}

function describe(resolved: ResolvedNisab): string {
  const amount = `RM${resolved.nisabRM.toLocaleString()}`;
  if (resolved.source.kind === "state") {
    return `${amount}, based on ${MALAYSIA_STATE_LABELS[resolved.source.state]}'s official rate`;
  }
  if (resolved.source.kind === "ppz_fallback") {
    return `${amount}, based on PPZ-MAIWP's published rate`;
  }
  return `${amount} (nationwide gold-price rate)`;
}

/**
 * Fires a local notification when the resolved nisab differs from what the
 * user was last notified about, so this is safe to call from every global
 * sync pass (foreground on app open, or the periodic background task)
 * without spamming a repeat alert for an unchanged figure. The very first
 * time this runs (no prior baseline recorded), it just establishes the
 * baseline silently — a brand-new install shouldn't announce "nisab
 * changed" for a figure the user has never seen before.
 */
export async function notifyIfNisabChanged(resolved: ResolvedNisab): Promise<void> {
  const last = await getLastNotifiedNisab();
  const currentState = resolved.source.kind === "state" ? resolved.source.state : null;

  const unchanged =
    last !== null &&
    last.nisabRM === resolved.nisabRM &&
    last.sourceKind === resolved.source.kind &&
    last.sourceState === currentState;

  if (unchanged) return;

  if (last !== null) {
    const granted = await ensureNotificationPermissions();
    if (granted) {
      await ensureChannel();
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_IDENTIFIER,
        content: {
          title: "Zakat Nisab Updated",
          body: `Your Zakat nisab is now ${describe(resolved)}.`,
          sound: true,
        },
        trigger: null,
      });
    }
  }

  await recordNotifiedNisab(resolved);
}
