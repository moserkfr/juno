/**
 * Renderer entry: builds the handheld shell once, owns the store, and swaps
 * the tab view in the middle. Data layers (auth, Firestore) plug in later
 * by calling store.set(...).
 */
import { createStore } from "./core/store.js";
import { h } from "./core/dom.js";
import { loadLocalPrefs, saveLocalPrefs } from "./core/prefs.js";
import { computeProgress } from "../data/plan.js";
import { applyTheme } from "./ui/themes.js";
import { createTitlebar } from "./ui/titlebar.js";
import { createStatusbar } from "./ui/statusbar.js";
import { createScene } from "./ui/scene.js";
import { createNav, TABS } from "./ui/nav.js";
import { createToasts } from "./ui/toast.js";
import { placeholder } from "./views/placeholder.js";
import { settingsView } from "./views/settings.js";

const api = window.bytebun;

/* ---------------- state ---------------- */

const prefs = loadLocalPrefs();
applyTheme(prefs.theme); // before first paint, so there's no theme flash

const store = createStore({
  view: "list",
  prefs,
  win: {},                 // window state mirrored from the main process
  items: {},               // my progress items (filled by sync stage)
  progress: computeProgress({}, prefs.track, prefs.hours),
  dialogue: null,          // { who, text } latest buddy message
  mood: "idle",
  unread: 0,
  online: navigator.onLine,
});

/* ---------------- actions (the only way views change state) ---------------- */

const actions = {
  go: view => store.set({ view }),
  setPrefs(patch) {
    const s = store.get();
    const next = { ...s.prefs, ...patch };
    saveLocalPrefs(next);
    store.set({ prefs: next, progress: computeProgress(s.items, next.track, next.hours) });
  },
  setTheme(theme) {
    applyTheme(theme);
    actions.setPrefs({ theme });
  },
};

/* ---------------- views ---------------- */

const VIEWS = {
  list: placeholder("list", "CHECKLIST", "Your topics arrive in stage 4."),
  review: placeholder("review", "REVIEW", "Spaced reviews arrive in stage 6."),
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
function showView(id) {
  if (current.id === id) return;
  current.inst?.destroy?.();
  viewEl.replaceChildren();
  viewEl.scrollTop = 0;
  current = { id, inst: VIEWS[id].mount(viewEl, { store, actions }) || {} };
}

function render(s) {
  titlebar.update(s);
  status.update(s);
  scene.update(s);
  nav.update(s);
  offline.classList.toggle("on", !s.online);
  showView(s.view);
  current.inst.update?.(s);
}
store.subscribe(render);

/* ---------------- wiring to the main process + OS ---------------- */

api.onState(win => store.set({ win }));
api.getState().then(win => {
  // Collapsed mode UI is built in stage 10; until then always open expanded.
  if (win.isCollapsed) api.setCollapsed(false);
  store.set({ win });
});
addEventListener("online", () => store.set({ online: true }));
addEventListener("offline", () => store.set({ online: false }));

// Ctrl+1..5 switches tabs
addEventListener("keydown", e => {
  if (e.ctrlKey && e.key >= "1" && e.key <= "5") actions.go(TABS[+e.key - 1].id);
});

render(store.get());
