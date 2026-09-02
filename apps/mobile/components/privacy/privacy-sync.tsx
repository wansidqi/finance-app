import { getHideAmounts, setHideAmounts } from "@/local/ui-settings-service";
import { hideAmountsAtom } from "@/state/privacy.state";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";

/**
 * Hydrates the "hide amounts" toggle from the DB on mount, then persists it
 * on every change. The mount-time write is skipped — without that guard the
 * atom's default (`false`) would fire the persist effect before the async
 * hydration read resolves, overwriting a previously-saved `true`.
 */
export function PrivacySync() {
  const [hideAmounts, setHideAmountsAtom] = useAtom(hideAmountsAtom);
  const skipNextWrite = useRef(true);

  useEffect(() => {
    getHideAmounts()
      .then(setHideAmountsAtom)
      .catch((err) => console.warn("Failed to load hide-amounts setting", err));
  }, [setHideAmountsAtom]);

  useEffect(() => {
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    setHideAmounts(hideAmounts).catch((err) =>
      console.warn("Failed to persist hide-amounts setting", err),
    );
  }, [hideAmounts]);

  return null;
}
