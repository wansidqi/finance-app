import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Shared across every notification-producing feature (zakat, payment
// reminders, ...) — must only be set once per app, so it lives here rather
// than in any single feature's notification module.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function ensureAndroidChannel(config: {
  id: string;
  name: string;
  color: string;
}): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(config.id, {
    name: config.name,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: config.color,
  });
}

/**
 * Cancels every scheduled notification whose identifier starts with
 * `prefix`. Each feature schedules under its own identifier prefix, so
 * rebuilding one feature's reminders (e.g. after a due date changes) never
 * touches another feature's already-scheduled notifications.
 */
export async function cancelNotificationsWithPrefix(prefix: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
