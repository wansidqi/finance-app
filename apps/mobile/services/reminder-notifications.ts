import { ReminderInterface } from "@/interface/reminder";
import * as Notifications from "expo-notifications";
import {
  cancelNotificationsWithPrefix,
  ensureAndroidChannel,
  ensureNotificationPermissions,
} from "./notifications-core";

const REMINDER_OFFSETS_DAYS = [7, 3, 1, 0];
const NOTIFICATION_PREFIX = "payment-reminder-due-";
const ANDROID_CHANNEL_ID = "payment-reminders";
const REMINDER_HOUR = 9; // local time the reminder fires

async function ensureChannel() {
  await ensureAndroidChannel({
    id: ANDROID_CHANNEL_ID,
    name: "Payment Reminders",
    color: "#f59e0b",
  });
}

function reminderContent(reminder: ReminderInterface, offsetDays: number) {
  const amount = `RM${reminder.amount.toLocaleString()}`;

  if (offsetDays === 0) {
    return {
      title: `${reminder.name} is due today`,
      body: `${amount} is due today.`,
    };
  }

  const dueDateLabel = new Date(reminder.next_due_date).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    title: `${reminder.name} due in ${offsetDays} day${offsetDays > 1 ? "s" : ""}`,
    body: `${amount} will be due on ${dueDateLabel}.`,
  };
}

/**
 * Rebuilds every scheduled payment-reminder notification from the current
 * reminder list — cancelling old ones first so a due date that moved (after
 * marking a reminder paid, editing it, etc.) never leaves a stale
 * notification behind. Only ever touches identifiers under this feature's
 * own prefix, so zakat's scheduled notifications are untouched.
 */
export async function syncReminderNotifications(reminders: ReminderInterface[]) {
  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  await ensureChannel();
  await cancelNotificationsWithPrefix(NOTIFICATION_PREFIX);

  const now = new Date();

  for (const reminder of reminders) {
    if (reminder.status !== "ACTIVE") continue;

    const dueDate = new Date(reminder.next_due_date);

    for (const offsetDays of REMINDER_OFFSETS_DAYS) {
      const triggerDate = new Date(dueDate);
      triggerDate.setDate(triggerDate.getDate() - offsetDays);
      triggerDate.setHours(REMINDER_HOUR, 0, 0, 0);

      if (triggerDate.getTime() <= now.getTime()) continue;

      const identifier = `${NOTIFICATION_PREFIX}${reminder.id}-${offsetDays}`;

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          ...reminderContent(reminder, offsetDays),
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  }
}
