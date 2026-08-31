import { useGetReminders, useReminderNotificationSettings } from "@/services/reminder";
import { syncReminderNotifications } from "@/services/reminder-notifications";
import { useEffect } from "react";

/**
 * Keeps payment-reminder notifications in sync app-wide, independent of
 * whether the Reminders screen happens to be mounted — mirrors
 * components/zakat/reminder-sync.tsx.
 *
 * Depends on the notification settings query in addition to the reminders
 * list: TanStack Query's structural sharing means `reminders` keeps its old
 * object reference when a refetch returns value-identical rows, so a global
 * timing change (which doesn't touch any reminder row) could invalidate the
 * reminders query without ever changing this effect's dependency — leaving
 * default-timing reminders stuck on their old schedule. Depending on the
 * settings values directly guarantees the resync actually runs.
 */
export function PaymentReminderSync() {
  const { data: reminders } = useGetReminders();
  const { data: settings } = useReminderNotificationSettings();

  useEffect(() => {
    if (!reminders || !settings) return;
    syncReminderNotifications(reminders).catch((err) =>
      console.warn("Failed to sync payment reminder notifications", err),
    );
  }, [reminders, settings?.mode, settings?.hour, settings?.minute, settings?.offsets_days]);

  return null;
}
