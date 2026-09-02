import { atom } from "jotai";

// Global "hide amounts" toggle, flipped from the Dashboard's eye icon.
// Defaults to visible (false) until `PrivacySync` (components/privacy/privacy-sync.tsx)
// hydrates it from the persisted value in `ui_settings` on mount.
export const hideAmountsAtom = atom(false);
