import { useGetReminders } from "@/services/reminder";
import { syncReminderNotifications } from "@/services/reminder-notifications";
import { useEffect } from "react";

/**
 * Keeps payment-reminder notifications in sync app-wide, independent of
 * whether the Reminders screen happens to be mounted — mirrors
 * components/zakat/reminder-sync.tsx.
 */
export function PaymentReminderSync() {
  const { data: reminders } = useGetReminders();

  useEffect(() => {
    if (!reminders) return;
    syncReminderNotifications(reminders).catch((err) =>
      console.warn("Failed to sync payment reminder notifications", err),
    );
  }, [reminders]);

  return null;
}
