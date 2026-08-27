import { ZakatTrackerDto } from "@/interface/zakat";
import axios from "axios";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { syncZakatReminders } from "./zakat-notifications";

export const ZAKAT_BACKGROUND_TASK = "zakat-reminder-background-sync";

// Must run at module load (not inside a function/component) — when the OS
// wakes the app up in the background, Expo re-imports the module graph and
// needs this side effect to have already registered the task executor
// before it tries to invoke it by name.
TaskManager.defineTask(ZAKAT_BACKGROUND_TASK, async () => {
  try {
    const response = await axios.get<ZakatTrackerDto[]>(
      `${process.env.EXPO_PUBLIC_API_URL}/api/get-categories`,
      { timeout: 10000 },
    );
    await syncZakatReminders(response.data);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (err) {
    // Most commonly means the backend simply isn't reachable from wherever
    // the phone is right now (e.g. off the home Wi-Fi) — expected, not a
    // bug. The next scheduled run just tries again.
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
