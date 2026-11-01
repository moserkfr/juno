/**
 * Pixel toasts for visible errors/info, plus a persistent OFFLINE strip.
 *   toast("Couldn't save", "Check your connection", "error")
 * Same message twice in a row isn't stacked; errors stay until closed.
 */
import { h, raw } from "../core/dom.js";
import { glyph } from "../art/sprites.js";

let host = null;
const live = new Map();

export function createToasts() {
  host = h("div.toasts", { role: "status", "aria-live": "polite" });
  return host;
}

export function toast(title, body = "", kind = "info", ms = kind === "error" ? 0 : 3500) {
  if (!host) return;
  const key = kind + title + body;
  if (live.has(key)) return;
  const close = () => { el.remove(); live.delete(key); };
  const el = h("div.toast.pbox." + kind, {},
    h("div", {}, h("b", {}, title), body),
    h("button.x", { onclick: close, title: "Dismiss", "aria-label": "Dismiss" }, raw(glyph("close", 1))));
  live.set(key, el);
  host.append(el);
  if (ms) setTimeout(close, ms);
}

/** Turn a Firebase error into a short friendly message. */
export function explainError(e) {
  const code = (e && e.code) || "";
  const map = {
    "permission-denied": "Permission denied. Is this account on the allowed list and verified?",
    "unavailable": "Can't reach the server. Working offline; changes will sync later.",
    "auth/network-request-failed": "No internet connection.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/invalid-email": "That doesn't look like an email address.",
    "auth/email-already-in-use": "That email already has an account. Try signing in.",
    "auth/weak-password": "Password needs at least 6 characters.",
    "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
    "auth/missing-password": "Enter a password.",
  };
  return map[code] || map[code.replace(/^firestore\//, "")] || (e && e.message) || String(e);
}
