import { getAllReminders } from "@/local/reminder-service";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { syncReminderNotifications } from "./reminder-notifications";

export const REMINDER_BACKGROUND_TASK = "payment-reminder-background-sync";

// Must run at module load (not inside a function/component) — when the OS
// wakes the app up in the background, Expo re-imports the module graph and
// needs this side effect to have already registered the task executor
// before it tries to invoke it by name. See zakat-background-task.ts, which
// this mirrors.
TaskManager.defineTask(REMINDER_BACKGROUND_TASK, async () => {
  try {
    const reminders = await getAllReminders();
    await syncReminderNotifications(reminders);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (err) {
    console.warn("Payment reminder background sync failed", err);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Registers the periodic background sync, if it isn't already registered.
 * Safe to call on every app start — registration persists across restarts.
 */
export async function registerReminderBackgroundTask() {
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(REMINDER_BACKGROUND_TASK);
  if (alreadyRegistered) return;

  await BackgroundTask.registerTaskAsync(REMINDER_BACKGROUND_TASK, {
    // The OS treats this as a floor, not a guarantee — real-world runs can
    // land hours later depending on battery/idle state.
    minimumInterval: 12 * 60,
  });
}

/**
 * Manually fires the background task right now, for testing — only works
 * in a debug/dev-client build, per expo-background-task's own docs.
 */
export async function triggerReminderBackgroundTaskForTesting() {
  return BackgroundTask.triggerTaskWorkerForTestingAsync();
}
