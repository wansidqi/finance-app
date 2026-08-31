import { getAllStateNisabRates, invalidateStateNisabCache } from "@/local/nisab-state-sync-service";
import { detectAndStoreLocation, getStoredLocation } from "@/local/state-location-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetDetectedLocation = () => {
  return useQuery({
    queryKey: ["zakat-detected-location"],
    queryFn: getStoredLocation,
  });
};

/** Every jurisdiction apps/backend currently has a nisab figure for — scraped or AI fallback, tagged via `isScraped`. Empty if no backend is configured/reachable, which is expected until EXPO_PUBLIC_API_URL is set. */
export const useGetAllStateNisabRates = () => {
  return useQuery({
    queryKey: ["zakat-state-nisab-rates"],
    queryFn: getAllStateNisabRates,
  });
};

export const useDetectLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const location = await detectAndStoreLocation();
      // Detecting a state is the moment its rate becomes useful to show —
      // bust the short-lived in-memory cache so the next read is fresh
      // rather than possibly up to CACHE_TTL_MS stale. No scrape/AI call
      // to trigger here anymore: apps/backend already keeps all 14 states
      // refreshed on its own schedule, independent of any single device.
      invalidateStateNisabCache();
      return location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-detected-location"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-categories"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-state-nisab-rates"] });
    },
  });
};
