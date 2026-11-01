/**
 * Renderer entry: builds the handheld shell once, owns the store, and swaps
 * the tab view in the middle. Firebase layers (auth, sync) feed the store via
 * store.set(...); views change data only through `actions`.
 */
import { createStore } from "./core/store.js";
import { h } from "./core/dom.js";
import { loadLocalPrefs, saveLocalPrefs } from "./core/prefs.js";
import { computeProgress, findSub, PLAN } from "../data/plan.js";
import { flag, unflag, reviewed, isEmpty, startOfDay } from "../data/review.js";
import { reviewView, dueCount } from "./views/review.js";
import { listView } from "./views/list.js";
import { applyTheme } from "./ui/themes.js";
import { createTitlebar } from "./ui/titlebar.js";
import { createStatusbar } from "./ui/statusbar.js";
import { createScene } from "./ui/scene.js";
import { createNav, TABS } from "./ui/nav.js";
import { createToasts, toast, explainError } from "./ui/toast.js";
import { createPill } from "./ui/pill.js";
import { placeholder } from "./views/placeholder.js";
import { settingsView } from "./views/settings.js";
import { authView } from "./views/auth.js";
import { watchAuth, signOut } from "./firebase/auth.js";
import { createSync } from "./firebase/sync.js";
import { createBuddyWatch, logActivity } from "./firebase/buddy.js";
import { buddyView } from "./views/buddy.js";
import { watchChat, sendMessage, markRead } from "./firebase/chat.js";
import { chatView } from "./views/chat.js";

const api = window.juno;

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
  people: {},              // everyone's public data (firebase/buddy.js), read-only
  messages: [],            // last 200 chat messages, oldest first
  chatReadAt: 0,           // local "read up to" (also synced on my user doc)
  winVisible: true,
  winFocused: document.hasFocus(),
  update: null,            // version string once an update is downloaded
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
const itemsKey = uid => "juno.items." + uid;
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

/** Everyone else's data for the BUDDY tab (read-only). */
const buddies = createBuddyWatch({
  onPeople: people => store.set({ people }),
  onError(e) {
    console.error("buddy", e);
    toast("CAN'T SEE BUDDY", explainError(e), "error");
  },
});

/** Add an event to my activity feed. Failures are reported but never block the UI. */
function log(event) {
  const uid = store.get().auth.user?.uid;
  if (!uid || PREVIEW) return;
  logActivity(uid, event).catch(e => {
    // Offline: addDoc is queued by Firestore; only the trim step may fail. Don't nag.
    if (e.code !== "unavailable") toast("ACTIVITY NOT SAVED", explainError(e), "warn");
  });
}

/* ---------------- chat ---------------- */

let unsubChat = null;
function startChat() {
  stopChat();
  unsubChat = watchChat(
    messages => store.set({ messages }),
    e => { console.error("chat", e); toast("CHAT UNAVAILABLE", explainError(e), "error"); });
}
function stopChat() { unsubChat?.(); unsubChat = null; }

/** Newest "read up to" from this device or any other (my user doc). */
const readAt = s => Math.max(s.chatReadAt || 0, s.people[s.auth.user?.uid]?.chatReadAt || 0);

/** Messages from others that arrived after my read position. */
function unreadCount(s) {
  const me = s.auth.user?.uid;
  if (!me) return 0;
  const r = readAt(s);
  return s.messages.filter(m => m.uid !== me && m.at > r).length;
}

/** Dialogue box: the buddy's latest message, or null (= Juno's line of the day). */
function buddyLine(s) {
  const me = s.auth.user?.uid;
  const m = [...s.messages].reverse().find(x => x.uid !== me);
  if (!m) return null;
  const p = s.people[m.uid];
  return {
    who: (p?.displayName || m.name).toUpperCase(),
    avatar: p?.prefs?.avatar,
    text: m.type === "nudge" ? "♥ *poke* Hey, study buddy!" : m.text,
  };
}

/**
 * Mark chat read when you can actually see it: CHAT tab open AND window
 * visible AND focused. Runs debounced AFTER renders (never inside one),
 * and writes at most once per burst of messages.
 */
let readTimer = null;
store.subscribe(() => {
  clearTimeout(readTimer);
  readTimer = setTimeout(() => {
    const s = store.get();
    if (s.auth.status !== "ready" || s.view !== "chat" || !s.winVisible || !s.winFocused) return;
    if (!unreadCount(s)) return;
    const newest = s.messages.at(-1)?.at || Date.now();
    store.set({ chatReadAt: Math.max(Date.now(), newest) });
    if (!PREVIEW) markRead(s.auth.user.uid).catch(e => console.error("markRead", e));
  }, 600);
});

/* ---------------- notifications ---------------- */

// Per-device switch (localStorage, not synced): you may want them on one PC only.
const NOTIFY_KEY = "juno.notify";
const notifyEnabled = () => { try { return localStorage.getItem(NOTIFY_KEY) !== "0"; } catch { return true; } };
const setNotifyEnabled = on => { try { localStorage.setItem(NOTIFY_KEY, on ? "1" : "0"); } catch { /* ignore */ } };

let notifyBaseline = null;  // newest message time already "seen" by the notifier
let lastUnreadSent = -1;

/** Only bother you when you're not looking at the widget. */
const awayFromWidget = s => !s.winVisible || !s.winFocused || !!s.win.isCollapsed;

function describe(m, name) {
  if (m.type === "nudge") return { title: `♥ ${name} poked you!`, body: "Study break's over? Let's go!" };
  if (m.type === "progress") return { title: `★ ${name}`, body: m.text };
  return { title: name, body: m.text };
}

store.subscribe(s => {
  if (s.auth.status !== "ready") { notifyBaseline = null; if (lastUnreadSent) { lastUnreadSent = 0; api.setUnread(0); } return; }

  // Tray dot / tooltip
  const unread = unreadCount(s);
  if (unread !== lastUnreadSent) { lastUnreadSent = unread; api.setUnread(unread); }

  // New messages from others since the last check
  if (!s.messages.length) return;
  const newest = s.messages.at(-1).at;
  if (notifyBaseline == null) { notifyBaseline = newest; return; } // initial history: no pings
  const me = s.auth.user.uid;
  const fresh = s.messages.filter(m => m.at > notifyBaseline && m.uid !== me && m.at > readAt(s));
  notifyBaseline = Math.max(notifyBaseline, newest);
  if (!fresh.length || !notifyEnabled() || !awayFromWidget(s)) return;

  const last = fresh.at(-1);
  const name = s.people[last.uid]?.displayName || last.name || "Buddy";
  // A nudge makes Juno hop, even in the pill.
  if (fresh.some(m => m.type === "nudge")) { scene.mascot.celebrate(); pill.mascot.celebrate(); }
  if (fresh.length === 1) { const d = describe(last, name); api.notify(d.title, d.body); }
  else api.notify(name, `sent ${fresh.length} messages: "${last.text.slice(0, 80)}"`);
});

// Auto-update downloaded (installed app only).
function onUpdate(version) {
  if (!version || store.get().update === version) return;
  store.set({ update: version });
  toast("UPDATE READY", `Juno v${version} installs when you restart (SET → ABOUT, or the tray menu).`, "info", 0);
}
api.onUpdate(onUpdate);
api.updateReady().then(onUpdate);

// Clicking a notification asks us to open a tab.
api.onNavigate(view => { if (store.get().auth.status === "ready") actions.go(view); });

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
    const sub = findSub(id);
    if (r.progress.lv > r.prev.lv && sub) {
      toast(`LEVEL UP! LV.${String(r.progress.lv).padStart(2, "0")}`, `${sub.topic.title} complete!`, "info", 5000);
      log({ type: "topic", key: sub.topic.id, text: `finished ${sub.topic.title}` });
      // Did that also finish the whole phase (within my track)?
      const ph = r.progress.phases.find(p => p.id === sub.phase.id);
      if (ph && ph.total && ph.done === ph.total) {
        log({ type: "phase", key: ph.id, text: `cleared Phase ${PLAN.indexOf(sub.phase)}: ${ph.name}!` });
      }
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
  /** Send a chat message. Returns once queued locally; server rejections show a toast. */
  sendChat(text, type = "text") {
    const s = store.get();
    if (PREVIEW) {
      store.set({ messages: [...s.messages, { id: String(Date.now()), uid: s.auth.user.uid, name: s.auth.user.displayName, text, type, at: Date.now() }] });
      return;
    }
    try {
      sendMessage(s.auth.user, text, type).catch(e => toast("MESSAGE NOT SENT", explainError(e), "error"));
    } catch (e) {
      toast("CAN'T SEND", e.message, "warn");
      throw e;
    }
  },
  toast: (...a) => toast(...a),
  notifyEnabled: () => notifyEnabled(),
  setNotify(on) { setNotifyEnabled(on); store.set({}); },
  testNotify: () => api.notify("Juno", "Notifications work! ♥"),
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
  buddy: buddyView,
  chat: chatView,
  settings: settingsView,
};

/* ---------------- shell ---------------- */

const titlebar = createTitlebar(store);
const status = createStatusbar();
const scene = createScene({ onDialogueClick: () => actions.go("chat") });
const nav = createNav(actions.go);
const viewEl = h("main.view", { id: "view" });
const offline = h("div.offline", {}, "OFFLINE · changes will sync when you're back");
const pill = createPill({
  onExpand(view) {
    api.setCollapsed(false);
    if (view && store.get().auth.status === "ready") actions.go(view);
  },
});

document.getElementById("app").append(
  pill.el,
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
  // While gated, Juno talks; otherwise the buddy's latest message (or a daily line).
  scene.update({ ...s, dialogue: gated ? { who: "JUNO", text: GATE_LINES[s.auth.status] } : buddyLine(s) });
  const unread = s.auth.status === "ready" ? unreadCount(s) : 0;
  nav.update({ ...s, due: dueCount(s.items), unread });
  // Collapsed = the 300x70 pill; the handheld stays mounted (just hidden).
  document.body.classList.toggle("collapsed", !!s.win.isCollapsed);
  pill.update({ ...s, unread });
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
  if (a.status === "ready" && !PREVIEW) { sync.start(a.user.uid, items); sync.touch(); buddies.start(a.user.uid); startChat(); }
  if (a.status !== "ready") { sync.stop(); buddies.stop(); stopChat(); store.set({ people: {}, messages: [], chatReadAt: 0 }); }
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
  onAuth({ status: "ready", user: { uid, email: "preview@local", displayName: "Manosh" } });
  // A fake buddy on a different track, to preview the BUDDY tab.
  const bItems = {};
  ["stl", "bigo", "math", "rec", "hash", "basicsort", "msqs"].forEach(t =>
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(i => findSub(`${t}-${i}`) && (bItems[`${t}-${i}`] = { done: true })));
  bItems["arr-0"] = { done: true }; bItems["arr-1"] = { done: true, review: true };
  const hr = 3_600_000;
  const min = 60_000;
  store.set({
    messages: [
      { id: "1", uid: "buddy", name: "Ruhani", type: "text", text: "did you finish recursion yet??", at: Date.now() - 26 * hr },
      { id: "2", uid: "preview", name: "Manosh", type: "text", text: "almost! the fib tree finally clicked", at: Date.now() - 25 * hr },
      { id: "3", uid: "buddy", name: "Ruhani", type: "progress", text: "I just finished Merge sort & quick sort (22%)", at: Date.now() - 2 * hr },
      { id: "4", uid: "buddy", name: "Ruhani", type: "nudge", text: "♥ poke!", at: Date.now() - 30 * min },
      { id: "5", uid: "buddy", name: "Ruhani", type: "text", text: "study session at 9? i'll do binary search 🔍", at: Date.now() - 3 * min },
    ],
    prefs: { ...store.get().prefs, avatar: "manosh" },
    people: {
      preview: { uid: "preview", feed: [{ uid: "preview", text: "finished Recursion basics", at: Date.now() - 26 * hr }] },
      buddy: { uid: "buddy", displayName: "Ruhani", prefs: { track: "ds", hours: 2, avatar: "ruhani" }, lastActive: Date.now() - 2 * 60_000,
               items: bItems, feed: [
                 { uid: "buddy", text: "finished Merge sort & quick sort", at: Date.now() - 2 * hr },
                 { uid: "buddy", text: "cleared Phase 1: Foundations!", at: Date.now() - 30 * hr }] },
    },
  });
} else {
  watchAuth(onAuth);
}

// Quitting from the tray / closing: hand pending edits to Firestore's local
// queue (synchronous part of flush), so they're sent on next launch at worst.
addEventListener("beforeunload", () => sync.flush());
// Hiding to tray is a good moment to save too.
api.onVisibility(visible => { store.set({ winVisible: visible }); if (!visible) sync.flush(); });
api.onFocus(focused => store.set({ winFocused: focused }));

// Re-check the mascot's mood every 10 min (it gets sleepy after midnight).
setInterval(() => store.set({ mood: moodFor(store.get().items) }), 10 * 60_000);

// Ctrl+1..5 switches tabs
addEventListener("keydown", e => {
  if (store.get().auth.status !== "ready") return;
  if (e.ctrlKey && e.key >= "1" && e.key <= "5") actions.go(TABS[+e.key - 1].id);
});

render(store.get());
