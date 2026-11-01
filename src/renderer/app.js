/**
 * Renderer entry: builds the handheld shell once, owns the store, and swaps
 * the tab view in the middle. Firebase layers (auth, sync) feed the store via
 * store.set(...); views change data only through `actions`.
 */
import { createStore } from "./core/store.js";
import { h } from "./core/dom.js";
import { loadLocalPrefs, saveLocalPrefs } from "./core/prefs.js";
import { computeProgress, findSub } from "../data/plan.js";
import { flag, unflag, reviewed, isEmpty, startOfDay } from "../data/review.js";
import { reviewView, dueCount } from "./views/review.js";
import { listView } from "./views/list.js";
import { applyTheme } from "./ui/themes.js";
import { createTitlebar } from "./ui/titlebar.js";
import { createStatusbar } from "./ui/statusbar.js";
import { createScene } from "./ui/scene.js";
import { createNav, TABS } from "./ui/nav.js";
import { createToasts, toast, explainError } from "./ui/toast.js";
import { placeholder } from "./views/placeholder.js";
import { settingsView } from "./views/settings.js";
import { authView } from "./views/auth.js";
import { watchAuth, signOut } from "./firebase/auth.js";
import { createSync } from "./firebase/sync.js";

const api = window.bytebun;

/* ---------------- state ---------------- */

const prefs = loadLocalPrefs();
applyTheme(prefs.theme); // before first paint, so there's no theme flash

const store = createStore({
  auth: { status: "loading", user: null }, // see firebase/auth.js for the statuses
  view: "list",
  prefs,
  win: {},                 // window state mirrored from the main process
  items: {},               // my progress items (synced with Firestore)
  sync: "saved",           // saving | saved | offline | error
  progress: computeProgress({}, prefs.track, prefs.hours),
  dialogue: null,          // { who, text } latest buddy message
  mood: "idle",
  unread: 0,
  online: navigator.onLine,
});

/* ---------------- sync ---------------- */

// Stage 4 kept items in localStorage. They're read once, handed to sync for a
// one-time upload if the account has nothing in Firestore yet, then removed.
const PREVIEW = location.hash === "#preview";
const itemsKey = uid => "bytebun.items." + uid;
function takeLegacyItems(uid) {
  try {
    const items = JSON.parse(localStorage.getItem(itemsKey(uid)) || "{}");
    if (!PREVIEW) localStorage.removeItem(itemsKey(uid));
    return items;
  } catch { return {}; }
}

const sync = createSync(store, {
  onItems(items) {
    const { prefs } = store.get();
    store.set({ items, progress: computeProgress(items, prefs.track, prefs.hours), mood: moodFor(items) });
  },
  onPrefs(remote, first) {
    const s = store.get();
    // Window prefs aren't part of app prefs; peel them off.
    const { window: win, opacity, alwaysOnTop, ...prefs } = remote;
    saveLocalPrefs(prefs);
    applyTheme(prefs.theme);
    store.set({ prefs, progress: computeProgress(s.items, prefs.track, prefs.hours) });
    // Move the window to where this account left it — once per sign-in only,
    // so our own saves echoing back never yank the window around.
    if (first) api.applyPrefs({ window: win, opacity, alwaysOnTop });
  },
  onStatus: sync => store.set({ sync }),
  onError(e, what) {
    console.error("sync", what, e);
    const title = what === "save" ? "COULDN'T SAVE" : "SYNC PROBLEM";
    toast(title, explainError(e), "error");
  },
});

/** Mascot is sleepy until you tick something today. */
function moodFor(items) {
  const today = startOfDay();
  return Object.values(items).some(it => it.done && it.updatedAt >= today) ? "idle" : "sleepy";
}

/**
 * The one place an item changes: apply fn(oldItem, now) -> newItem,
 * drop it from the map if it became empty, recompute progress.
 */
function setItem(id, fn) {
  const s = store.get();
  const now = Date.now();
  const before = s.items[id] || {};
  const after = fn(before, now);
  const items = { ...s.items };
  if (isEmpty(after)) delete items[id]; else items[id] = after;
  const progress = computeProgress(items, s.prefs.track, s.prefs.hours);
  store.set({ items, progress, mood: moodFor(items) });
  sync.markItem(id);
  return { before, after, progress, prev: s.progress };
}

/* ---------------- actions (the only way views change state) ---------------- */

const actions = {
  go: view => store.set({ view }),
  toggleDone(id) {
    const r = setItem(id, (it, now) => ({ ...it, done: !it.done, updatedAt: now }));
    if (!r.after.done) return;
    scene.mascot.celebrate();
    if (r.progress.lv > r.prev.lv) {
      const t = findSub(id)?.topic;
      toast(`LEVEL UP! LV.${String(r.progress.lv).padStart(2, "0")}`, `${t ? t.title : "Topic"} complete!`, "info", 5000);
    }
  },
  toggleReview(id) {
    setItem(id, (it, now) => (it.review ? unflag(it, now) : flag(it, now)));
  },
  /** "Reviewed": advance to the next interval (+7, +30, then finished). */
  reviewItem(id) {
    const r = setItem(id, (it, now) => reviewed(it, now));
    scene.mascot.celebrate();
    if (r.after.stage >= 3) toast("ALL 3 REVIEWS DONE!", "Clear the ★ or go again?", "info");
  },
  /** After the last review: start a fresh +1/+7/+30 cycle. */
  restartReview(id) {
    setItem(id, (it, now) => flag(it, now));
  },
  /** Short note per item; empty = remove the field (Firestore rejects undefined). */
  setNote(id, text) {
    const note = String(text || "").trim().slice(0, 140);
    const cur = store.get().items[id]?.note || "";
    if (note === cur) return;
    setItem(id, (it, now) => {
      const { note: _old, ...rest } = it;
      return note ? { ...rest, note, updatedAt: now } : { ...rest, updatedAt: now };
    });
  },
  setPrefs(patch) {
    const s = store.get();
    const next = { ...s.prefs, ...patch };
    saveLocalPrefs(next);
    store.set({ prefs: next, progress: computeProgress(s.items, next.track, next.hours) });
    sync.markPrefs();
  },
  setTheme(theme) {
    applyTheme(theme);
    actions.setPrefs({ theme });
  },
  async signOut() {
    // Hand any edits from the last 800 ms to Firestore. No await: offline it
    // would wait for the server forever. setDoc queues the write in the local
    // cache synchronously, and Firestore keeps it for this account's next sign-in.
    sync.flush();
    sync.stop();
    await signOut();
  },
};

/* ---------------- views ---------------- */

const VIEWS = {
  list: listView,
  review: reviewView,
  buddy: placeholder("buddy", "BUDDY", "Your buddy's progress arrives in stage 7."),
  chat: placeholder("chat", "CHAT", "Chat arrives in stage 8."),
  settings: settingsView,
};

/* ---------------- shell ---------------- */

const titlebar = createTitlebar(store);
const status = createStatusbar();
const scene = createScene({ onDialogueClick: () => actions.go("chat") });
const nav = createNav(actions.go);
const viewEl = h("main.view", { id: "view" });
const offline = h("div.offline", {}, "OFFLINE · changes will sync when you're back");

document.getElementById("app").append(
  h("div.device", {},
    titlebar.el,
    h("div.screen", {},
      status.el,
      h("div.dots"),
      scene.el,
      h("div.dots"),
      offline,
      viewEl,
      nav.el,
      createToasts())),
);

let current = { id: null, inst: null };
/** key changes => remount. The auth gate uses "auth:<status>" keys. */
function showView(key, viewDef) {
  if (current.id === key) return;
  current.inst?.destroy?.();
  viewEl.replaceChildren();
  viewEl.scrollTop = 0;
  current = { id: key, inst: viewDef.mount(viewEl, { store, actions }) || {} };
}

const GATE_LINES = {
  loading: "Waking up...",
  signedOut: "Who goes there? Sign in to start!",
  unverified: "Almost there! Check your inbox.",
  denied: "Hmm, I don't know this one...",
};

function render(s) {
  const gated = s.auth.status !== "ready";
  titlebar.update(s);
  status.update(s);
  // While gated, ByteBun talks instead of showing chat messages.
  scene.update(gated ? { ...s, dialogue: { who: "BYTEBUN", text: GATE_LINES[s.auth.status] } } : s);
  nav.update({ ...s, due: dueCount(s.items) });
  nav.el.style.display = gated ? "none" : "";
  offline.classList.toggle("on", !s.online);
  if (gated) showView("auth:" + s.auth.status, authView);
  else showView(s.view, VIEWS[s.view]);
  current.inst.update?.(s);
}
store.subscribe(render);

/* ---------------- wiring to the main process + OS ---------------- */

/**
 * Window state from the main process. When the user moves/resizes the window
 * or changes opacity / always-on-top, save it to their account (debounced by
 * sync). Visibility/focus-only changes don't count.
 */
const winKey = w => JSON.stringify([w.expanded, w.collapsed, w.isCollapsed, w.opacity, w.alwaysOnTop]);
api.onState(win => {
  const changed = winKey(win) !== winKey(store.get().win);
  store.set({ win });
  if (changed && store.get().auth.status === "ready") sync.markPrefs();
});
api.getState().then(win => {
  // Collapsed mode UI is built in stage 10; until then always open expanded.
  if (win.isCollapsed) api.setCollapsed(false);
  store.set({ win });
});
addEventListener("online", () => store.set({ online: true }));
addEventListener("offline", () => store.set({ online: false }));

/* ---------------- auth ---------------- */

function onAuth(a) {
  const was = store.get().auth.status;
  const { prefs } = store.get();
  // Entering: show any legacy local items instantly, then let sync take over
  // (Firestore's cache usually delivers the real data within milliseconds).
  // Leaving: stop syncing and clear this account's data from memory.
  const items = a.status === "ready" ? takeLegacyItems(a.user.uid) : {};
  store.set({ auth: a, items, progress: computeProgress(items, prefs.track, prefs.hours), mood: moodFor(items) });
  if (a.status === "ready" && !PREVIEW) { sync.start(a.user.uid, items); sync.touch(); }
  if (a.status !== "ready") sync.stop();
  if (a.status === "ready" && was !== "ready" && was !== "loading") {
    toast("WELCOME!", `Signed in as ${a.user.displayName}.`, "info");
  }
  if (a.offline) toast("OFFLINE", "Signed in from cache. Changes will sync when you're online.", "warn");
}

// Preview mode (index.html#preview, used only by scripts/shot.cjs for screenshots):
// fake local user + sample progress, no Firebase calls. The real app never
// loads with this hash, and Firestore data is protected by the rules anyway.
if (PREVIEW) {
  const uid = "preview";
  const sample = {};
  ["stl", "bigo", "math"].forEach(t => findSub(t + "-0") && [0, 1, 2, 3, 4, 5, 6].forEach(i => findSub(`${t}-${i}`) && (sample[`${t}-${i}`] = { done: true, updatedAt: Date.now() })));
  sample["rec-0"] = { done: true, updatedAt: Date.now() };
  sample["rec-2"] = flag({}, Date.now() - 86_400_000);
  sample["stl-3"] = { ...sample["stl-3"], ...flag({}, Date.now()) };
  sample["ll-8"] = { ...flag({}, Date.now() - 9 * 86_400_000), stage: 1, nextReviewAt: Date.now() - 2 * 86_400_000, note: "forgot the dummy node trick" };
  sample["bigo-4"] = { ...sample["bigo-4"], ...flag({}, Date.now() - 40 * 86_400_000), stage: 3, nextReviewAt: null };
  localStorage.setItem(itemsKey(uid), JSON.stringify(sample));
  onAuth({ status: "ready", user: { uid, email: "preview@local", displayName: "Preview" } });
} else {
  watchAuth(onAuth);
}

// Quitting from the tray / closing: hand pending edits to Firestore's local
// queue (synchronous part of flush), so they're sent on next launch at worst.
addEventListener("beforeunload", () => sync.flush());
// Hiding to tray is a good moment to save too.
api.onVisibility(visible => { if (!visible) sync.flush(); });

// Re-check the mascot's mood every 10 min (it gets sleepy after midnight).
setInterval(() => store.set({ mood: moodFor(store.get().items) }), 10 * 60_000);

// Ctrl+1..5 switches tabs
addEventListener("keydown", e => {
  if (store.get().auth.status !== "ready") return;
  if (e.ctrlKey && e.key >= "1" && e.key <= "5") actions.go(TABS[+e.key - 1].id);
});

render(store.get());
