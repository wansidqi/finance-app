import { syncAllStates } from "@/local/nisab-state-sync-service";
import { detectAndStoreLocation, getStoredLocation } from "@/local/state-location-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetDetectedLocation = () => {
  return useQuery({
    queryKey: ["zakat-detected-location"],
    queryFn: getStoredLocation,
  });
};

export const useDetectLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const location = await detectAndStoreLocation();
      // Detecting a state is the moment a live rate for it becomes useful —
      // sync immediately rather than waiting for the periodic background
      // check, so the user sees their state's actual nisab right away.
      await syncAllStates();
      return location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-detected-location"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-categories"] });
    },
  });
};

/** Runs the periodic (every `STATE_SYNC_INTERVAL_DAYS`) background refresh of all configured states' nisab rates, if due. Safe to call on every screen mount — it's a no-op most of the time. */
export const useRunScheduledStateSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncAllStates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-categories"] });
    },
  });
};
