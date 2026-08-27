import { ZakatTrackerDto } from "@/interface/zakat";
import * as Notifications from "expo-notifications";
import {
  cancelNotificationsWithPrefix,
  ensureAndroidChannel as ensureChannel,
  ensureNotificationPermissions,
} from "./notifications-core";

const REMINDER_OFFSETS_DAYS = [7, 5, 3, 1, 0];
const NOTIFICATION_PREFIX = "zakat-due-";
const ANDROID_CHANNEL_ID = "zakat-reminders";
const REMINDER_HOUR = 9; // local time the reminder fires

const ensurePermissions = ensureNotificationPermissions;

async function ensureAndroidChannel() {
  await ensureChannel({ id: ANDROID_CHANNEL_ID, name: "Zakat Reminders", color: "#10b981" });
}

function titleCase(category: string) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function reminderContent(category: ZakatTrackerDto, offsetDays: number) {
  const name = titleCase(category.category);
  const amount = `RM${category.zakat_due.toFixed(2)}`;

  if (offsetDays === 0) {
    return {
      title: `Zakat for ${name} is due today`,
      body: `${amount} is due today. Fulfill your obligation.`,
    };
  }

  const dueDateLabel = category.next_due_date
    ? new Date(category.next_due_date).toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return {
    title: `Zakat for ${name} due in ${offsetDays} day${offsetDays > 1 ? "s" : ""}`,
    body: `${amount} will be due on ${dueDateLabel}.`,
  };
}

/**
 * Fires a local notification a few seconds from now, independent of any
 * zakat due-date data — useful for confirming permissions, the Android
 * channel, and sound actually work before relying on the real reminders.
 */
export async function sendTestNotification(): Promise<boolean> {
  const granted = await ensurePermissions();
  if (!granted) return false;

  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    identifier: `${NOTIFICATION_PREFIX}test`,
    content: {
      title: "Zakat Tracker",
      body: "Test notification — if you see this, reminders are working.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      repeats: false,
      channelId: ANDROID_CHANNEL_ID,
    },
  });

  return true;
}

/**
 * Fires all 5 real reminder variants (7/5/3/1/0 days out) a few seconds
 * apart, using a fabricated category and the same content-generation logic
 * as the real reminders — lets you check the wording and sequencing without
 * waiting on real due dates or the 9am trigger hour.
 */
export async function sendTestDueSequence(): Promise<boolean> {
  const granted = await ensurePermissions();
  if (!granted) return false;

  await ensureAndroidChannel();

  const fakeDueDate = new Date();
  fakeDueDate.setDate(fakeDueDate.getDate() + 7);

  const fakeCategory: ZakatTrackerDto = {
    id: null,
    user_id: null,
    category: "TEST",
    value: 45000,
    status: "ACTIVE",
    created_at: null,
    updated_at: null,
    is_tracked: true,
    haul_status: "PENDING",
    nisab: 29740,
    nisab_reached: true,
    last_paid_date: null,
    last_paid_date_hijri: null,
    haul_start_date: null,
    next_due_date: fakeDueDate.toISOString(),
    next_due_date_hijri: null,
    zakat_due: 1125,
    platform_breakdown: [],
  };

  REMINDER_OFFSETS_DAYS.forEach((offsetDays, index) => {
    Notifications.scheduleNotificationAsync({
      identifier: `${NOTIFICATION_PREFIX}test-sequence-${offsetDays}`,
      content: {
        ...reminderContent(fakeCategory, offsetDays),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2 + index * 3,
        repeats: false,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  });

  return true;
}

/**
 * Rebuilds every scheduled zakat due-date reminder from the current tracker
 * data — cancelling old ones first so a due date that moved (e.g. after a
 * payment resets the haul cycle) never leaves a stale reminder behind.
 */
export async function syncZakatReminders(categories: ZakatTrackerDto[]) {
  const granted = await ensurePermissions();
  if (!granted) return;

  await ensureAndroidChannel();
  await cancelNotificationsWithPrefix(NOTIFICATION_PREFIX);

  const now = new Date();

  for (const category of categories) {
    if (!category.is_tracked || !category.next_due_date) continue;

    const dueDate = new Date(category.next_due_date);

    for (const offsetDays of REMINDER_OFFSETS_DAYS) {
      const triggerDate = new Date(dueDate);
      triggerDate.setDate(triggerDate.getDate() - offsetDays);
      triggerDate.setHours(REMINDER_HOUR, 0, 0, 0);

      if (triggerDate.getTime() <= now.getTime()) continue;

      const identifier = `${NOTIFICATION_PREFIX}${category.category}-${offsetDays}`;

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          ...reminderContent(category, offsetDays),
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
