import { getAllCategories } from "@/local/zakat-service";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { syncZakatReminders } from "./zakat-notifications";

export const ZAKAT_BACKGROUND_TASK = "zakat-reminder-background-sync";

// Must run at module load (not inside a function/component) — when the OS
// wakes the app up in the background, Expo re-imports the module graph and
// needs this side effect to have already registered the task executor
// before it tries to invoke it by name.
//
// Reads straight from the on-device database now (no network round-trip to
// a backend needed), so this reliably runs regardless of Wi-Fi — only the
// JAKIM/BNM live lookups inside getAllCategories still need network, and
// they already fall back gracefully if unreachable.
TaskManager.defineTask(ZAKAT_BACKGROUND_TASK, async () => {
  try {
    const categories = await getAllCategories();
    await syncZakatReminders(categories);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (err) {
    console.warn("Zakat background sync failed", err);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Registers the periodic background sync, if it isn't already registered.
 * Safe to call on every app start — registration persists across restarts.
 */
export async function registerZakatBackgroundTask() {
  const alreadyRegistered =
    await TaskManager.isTaskRegisteredAsync(ZAKAT_BACKGROUND_TASK);
  if (alreadyRegistered) return;

  await BackgroundTask.registerTaskAsync(ZAKAT_BACKGROUND_TASK, {
    // The OS treats this as a floor, not a guarantee — real-world runs can
    // land hours later depending on battery/idle state.
    minimumInterval: 12 * 60,
  });
}

/**
 * Manually fires the background task right now, for testing — only works
 * in a debug/dev-client build, per expo-background-task's own docs.
 */
export async function triggerZakatBackgroundTaskForTesting() {
  return BackgroundTask.triggerTaskWorkerForTestingAsync();
}
