/**
 * User preferences (track, hours, theme). Cached in localStorage so the app
 * paints with the right theme instantly; once signed in, the user's Firestore
 * doc is the source of truth and overwrites this cache.
 */
import { DEFAULT_TRACK, DEFAULT_HOURS } from "../../data/plan.js";
import { DEFAULT_THEME } from "../ui/themes.js";

const KEY = "juno.prefs";

// avatar: null until the user picks a character ("ruhani" | "manosh" | "juno")
export const DEFAULT_PREFS = { track: DEFAULT_TRACK, hours: DEFAULT_HOURS, theme: DEFAULT_THEME, avatar: null };

/** Fill in missing fields so old/partial saves never crash the UI. */
export function normalizePrefs(p = {}) {
  return {
    ...DEFAULT_PREFS,
    ...p,
    theme: { ...DEFAULT_THEME, ...(p.theme || {}) },
    // The mascot was called "ByteBun" before the rename to Juno.
    avatar: p.avatar === "bytebun" ? "juno" : p.avatar ?? null,
  };
}

export function loadLocalPrefs() {
  try { return normalizePrefs(JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch { return normalizePrefs(); }
}

export function saveLocalPrefs(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage full/blocked: ignore */ }
}
