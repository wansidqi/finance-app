import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import "react-native-reanimated";

import { BackupForegroundSync } from "@/components/backup/backup-foreground-sync";
import { PrivacySync } from "@/components/privacy/privacy-sync";
import { PaymentReminderSync } from "@/components/reminders/reminder-sync";
import { SplashScreen as AppSplashScreen } from "@/components/splash-screen";
import { ZakatReminderSync } from "@/components/zakat/reminder-sync";
import { StateNisabSync } from "@/components/zakat/state-nisab-sync";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { registerBackupBackgroundTask } from "@/services/backup-background-task";
import { registerReminderBackgroundTask } from "@/services/reminder-background-task";
import { registerZakatBackgroundTask } from "@/services/zakat-background-task";

import "@/global.css";

import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

// React Query's refetch-on-focus only fires automatically on web, where it
// listens to the browser's visibilitychange event. On native it needs to be
// told about app foreground/background transitions explicitly — without
// this, data (and anything derived from it, like zakat reminders) only ever
// refreshes on a cold launch, not when the app resumes from the background.
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(() => new QueryClient());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Android 12+ constrains the native OS splash to a small centered icon
    // regardless of config, so we hide it as soon as possible and hand off
    // to our own full-bleed animated splash (AppSplashScreen) in JS instead
    // of holding the native one on screen.
    SplashScreen.hideAsync();
    const timer = setTimeout(() => setIsReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      onAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    registerZakatBackgroundTask().catch((err) =>
      console.warn("Failed to register zakat background task", err),
    );
    registerReminderBackgroundTask().catch((err) =>
      console.warn("Failed to register payment reminder background task", err),
    );
    registerBackupBackgroundTask().catch((err) =>
      console.warn("Failed to register backup background task", err),
    );
  }, []);

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            {isReady ? (
              <>
                <ZakatReminderSync />
                <StateNisabSync />
                <PaymentReminderSync />
                <BackupForegroundSync />
                <PrivacySync />
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="asset/[id]"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="liability/[id]"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen name="backup" options={{ headerShown: false }} />
                  <Stack.Screen name="reminders" options={{ headerShown: false }} />
                  <Stack.Screen name="tax-relief" options={{ headerShown: false }} />
                </Stack>
                <StatusBar style="auto" />
              </>
            ) : (
              <AppSplashScreen />
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
