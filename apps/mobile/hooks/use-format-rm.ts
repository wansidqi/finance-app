import { hideAmountsAtom } from "@/state/privacy.state";
import { useAtom } from "jotai";

const MASK = "RM••••••";

/**
 * Formats a Ringgit amount, respecting the app-wide "hide amounts" toggle.
 * Pass `alwaysShow: true` for values that aren't sensitive (e.g. the Nisab
 * threshold, which is a public reference figure, not personal wealth) —
 * those stay visible even while everything else is masked.
 */
export function useFormatRM() {
  const [hideAmounts, setHideAmounts] = useAtom(hideAmountsAtom);

  function formatRM(
    value: number,
    options?: { decimals?: boolean; alwaysShow?: boolean },
  ): string {
    if (hideAmounts && !options?.alwaysShow) return MASK;

    const decimals = options?.decimals ?? false;
    return `RM${value.toLocaleString(
      undefined,
      decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : undefined,
    )}`;
  }

  return { formatRM, hideAmounts, setHideAmounts };
}
