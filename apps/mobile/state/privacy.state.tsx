import { atom } from "jotai";

// Global "hide amounts" toggle, flipped from the Dashboard's eye icon.
// Deliberately in-memory only (resets to visible on app restart) — there's
// no persistence layer wired up yet, and defaulting back to visible after a
// restart is the safer failure mode for a privacy toggle anyway.
export const hideAmountsAtom = atom(false);
