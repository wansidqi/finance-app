import { useGetZakatCategories } from "@/services/zakat";
import { syncZakatReminders } from "@/services/zakat-notifications";
import { useEffect } from "react";

/**
 * Keeps zakat due-date reminders in sync app-wide, independent of whether
 * the Zakat Tracker screen happens to be mounted — otherwise reminders
 * would only ever get (re)scheduled if the user specifically visited that
 * tab during the session.
 */
export function ZakatReminderSync() {
  const { data: zakatData } = useGetZakatCategories();

  useEffect(() => {
    if (!zakatData) return;
    syncZakatReminders(zakatData).catch((err) =>
      console.warn("Failed to sync zakat reminders", err),
    );
  }, [zakatData]);

  return null;
}
