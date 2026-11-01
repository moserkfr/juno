/**
 * Window state: size/position (separately for expanded and collapsed modes),
 * always-on-top, opacity and start-on-login.
 *
 * Saved to <userData>/window-state.json so the window appears in the right
 * place instantly at launch. Once signed in, the renderer also syncs these to
 * the user's Firestore prefs and pushes them back here via applyPrefs().
 */
const { app, screen } = require("electron");
const fs = require("fs");
const path = require("path");

const FILE = () => path.join(app.getPath("userData"), "window-state.json");

const SIZES = {
  expanded: { w: 420, h: 680, minW: 340, minH: 480 },
  collapsed: { w: 300, h: 70 },
};

function defaults() {
  // Top-right corner of the primary screen, 24px in from the edges.
  const wa = screen.getPrimaryDisplay().workArea;
  const { w, h } = SIZES.expanded;
  return {
    expanded: { x: wa.x + wa.width - w - 24, y: wa.y + 24, w, h },
    collapsed: { x: wa.x + wa.width - SIZES.collapsed.w - 24, y: wa.y + 24 },
    isCollapsed: false,
    alwaysOnTop: true,
    opacity: 1,
    startOnLogin: true,
  };
}

/** True if at least a 60x40 chunk of the rect is on some connected display. */
function isVisible(r) {
  return screen.getAllDisplays().some(d => {
    const a = d.workArea;
    const ix = Math.min(r.x + r.w, a.x + a.width) - Math.max(r.x, a.x);
    const iy = Math.min(r.y + r.h, a.y + a.height) - Math.max(r.y, a.y);
    return ix >= 60 && iy >= 40;
  });
}

let state = null;
let saveTimer = null;
let firstRun = false;

function load() {
  const def = defaults();
  try {
    const saved = JSON.parse(fs.readFileSync(FILE(), "utf8"));
    state = { ...def, ...saved };
  } catch {
    state = def;
    firstRun = true;
  }
  sanitize();
  return state;
}

/** Clamp values and pull off-screen windows back to the default spot. */
function sanitize() {
  const def = defaults();
  const e = state.expanded;
  if (!e || !isVisible({ ...e, w: e.w || SIZES.expanded.w, h: e.h || SIZES.expanded.h })) state.expanded = def.expanded;
  state.expanded.w = Math.max(SIZES.expanded.minW, state.expanded.w | 0);
  state.expanded.h = Math.max(SIZES.expanded.minH, state.expanded.h | 0);
  const c = state.collapsed;
  if (!c || !isVisible({ ...c, ...SIZES.collapsed, w: SIZES.collapsed.w, h: SIZES.collapsed.h })) state.collapsed = def.collapsed;
  state.opacity = Math.min(1, Math.max(0.6, Number(state.opacity) || 1));
}

/** Debounced write: dragging fires dozens of 'moved' events per second. */
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(FILE(), JSON.stringify(state, null, 2)); } catch (e) { console.error("window-state save failed", e); }
  }, 500);
}

function get() { return state; }
function set(patch) { Object.assign(state, patch); save(); return state; }

/** Record the window's current bounds into whichever mode it's in. */
function captureBounds(win) {
  if (!win || win.isDestroyed() || win.isMinimized()) return;
  const b = win.getBounds();
  if (state.isCollapsed) state.collapsed = { x: b.x, y: b.y };
  else state.expanded = { x: b.x, y: b.y, w: b.width, h: b.height };
  save();
}

/** BrowserWindow bounds for the current mode. */
function boundsFor(mode = state.isCollapsed ? "collapsed" : "expanded") {
  if (mode === "collapsed") return { x: state.collapsed.x, y: state.collapsed.y, width: SIZES.collapsed.w, height: SIZES.collapsed.h };
  const e = state.expanded;
  return { x: e.x, y: e.y, width: e.w, height: e.h };
}

module.exports = { load, get, set, save, sanitize, captureBounds, boundsFor, SIZES, isFirstRun: () => firstRun };
