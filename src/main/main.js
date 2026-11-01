/**
 * Electron main process: owns the window, tray, OS integration and IPC.
 * The UI (renderer) never touches Node — it asks for things through the
 * small API in src/preload/preload.js, and every handler below validates input.
 */
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const ws = require("./windowState");
const { createTray, refreshTray } = require("./tray");

// --- Single instance: a second launch just focuses the existing widget. ---
if (!app.requestSingleInstanceLock()) {
  app.quit();
  return; // CommonJS module scope: stop executing this file
}

// Needed on Windows for desktop notifications to show the app's name.
app.setAppUserModelId("com.bytebun.app");

let win = null;
let quitting = false;

/* ------------------------------------------------------------------ */
/*  Window                                                             */
/* ------------------------------------------------------------------ */

function createWindow() {
  const s = ws.load();
  const b = ws.boundsFor();

  win = new BrowserWindow({
    ...b,
    minWidth: s.isCollapsed ? ws.SIZES.collapsed.w : ws.SIZES.expanded.minW,
    minHeight: s.isCollapsed ? ws.SIZES.collapsed.h : ws.SIZES.expanded.minH,
    resizable: !s.isCollapsed,
    frame: false,               // we draw our own pixel title bar
    show: false,                // show once painted, avoids a white flash
    alwaysOnTop: s.alwaysOnTop,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: "#fff7d9", // matches Witch Cream while the page loads
    title: "ByteBun",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,   // page JS and preload JS live in separate worlds
      nodeIntegration: false,   // page JS cannot require() anything
      sandbox: true,            // renderer runs in Chromium's OS sandbox
      spellcheck: false,
    },
  });
  if (s.alwaysOnTop) win.setAlwaysOnTop(true, "floating");
  win.setOpacity(s.opacity);
  win.loadFile(path.join(__dirname, "../../dist/index.html"));

  win.once("ready-to-show", () => win.show());

  // Close button / Alt+F4 hides to tray; only tray "Quit" really exits.
  win.on("close", e => {
    if (!quitting) { e.preventDefault(); win.hide(); refreshTray(); }
  });
  win.on("show", refreshTray);
  win.on("hide", () => { refreshTray(); send("window:visibility", false); });
  win.on("show", () => send("window:visibility", true));
  win.on("focus", () => send("window:focus", true));
  win.on("blur", () => send("window:focus", false));
  win.on("moved", () => { ws.captureBounds(win); pushState(); });
  win.on("resized", () => { ws.captureBounds(win); pushState(); });

  // Security: the app is one local page. Never navigate away or open popups;
  // any link the page tries to open goes to the real browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", e => e.preventDefault());
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

/** Tell the renderer the current state (so the UI toggles stay in sync with the tray). */
function pushState() { send("window:state", publicState()); }

function publicState() {
  const s = ws.get();
  return {
    alwaysOnTop: s.alwaysOnTop, opacity: s.opacity, startOnLogin: s.startOnLogin,
    isCollapsed: s.isCollapsed, expanded: s.expanded, collapsed: s.collapsed,
    visible: !!(win && win.isVisible()), focused: !!(win && win.isFocused()),
    platform: process.platform, version: app.getVersion(),
  };
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function toggleVisible() {
  if (win.isVisible() && win.isFocused()) win.hide();
  else showWindow();
}

/* ------------------------------------------------------------------ */
/*  Actions (shared by tray menu and IPC)                              */
/* ------------------------------------------------------------------ */

function setAlwaysOnTop(on) {
  ws.set({ alwaysOnTop: !!on });
  win.setAlwaysOnTop(!!on, "floating");
  refreshTray(); pushState();
}

function setOpacity(v) {
  const o = Math.min(1, Math.max(0.6, Number(v) || 1)); // spec: 60–100 %
  ws.set({ opacity: o });
  win.setOpacity(o);
  pushState();
}

/**
 * Start on login. Only registered for the installed app: in dev, the "app"
 * is electron.exe running a folder, which we don't want launching at boot.
 */
function setStartOnLogin(on) {
  ws.set({ startOnLogin: !!on });
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!on });
  refreshTray(); pushState();
}

/** Switch between the ~420x680 handheld and the ~300x70 pill. */
function setCollapsed(c) {
  c = !!c;
  if (c === ws.get().isCollapsed) return;
  ws.captureBounds(win);              // remember where the current mode was
  ws.set({ isCollapsed: c });
  const { SIZES } = ws;
  if (c) {
    win.setResizable(false);
    win.setMinimumSize(SIZES.collapsed.w, SIZES.collapsed.h);
  } else {
    win.setMinimumSize(SIZES.expanded.minW, SIZES.expanded.minH);
    win.setResizable(true);
  }
  win.setBounds(ws.boundsFor());
  pushState();
}

/**
 * Apply prefs that came from the user's Firestore doc after sign-in
 * (so the window follows the account across devices).
 */
function applyPrefs(p = {}) {
  if (typeof p.alwaysOnTop === "boolean") setAlwaysOnTop(p.alwaysOnTop);
  if (p.opacity != null) setOpacity(p.opacity);
  const w = p.window;
  if (w && typeof w === "object") {
    const patch = {};
    if ([w.x, w.y, w.w, w.h].every(Number.isFinite)) patch.expanded = { x: w.x, y: w.y, w: w.w, h: w.h };
    if (w.cx != null && Number.isFinite(w.cx) && Number.isFinite(w.cy)) patch.collapsed = { x: w.cx, y: w.cy };
    ws.set(patch);
    ws.sanitize(); // discard positions that are off-screen on THIS device
    if (typeof w.collapsed === "boolean" && w.collapsed !== ws.get().isCollapsed) setCollapsed(w.collapsed);
    else win.setBounds(ws.boundsFor());
  }
  pushState();
}

/** Only http(s) links leave the app — never file:, javascript:, etc. */
function openExternal(url) {
  try {
    const u = new URL(String(url));
    if (u.protocol === "https:" || u.protocol === "http:") shell.openExternal(u.href);
  } catch { /* ignore malformed URLs */ }
}

function quit() { quitting = true; app.quit(); }

/* ------------------------------------------------------------------ */
/*  IPC: the handlers behind window.bytebun.* in the preload           */
/* ------------------------------------------------------------------ */

ipcMain.handle("app:getState", () => publicState());
ipcMain.on("win:minimize", () => win.minimize());
ipcMain.on("win:hide", () => win.hide());
ipcMain.on("win:show", () => showWindow());
ipcMain.on("win:setCollapsed", (_e, c) => setCollapsed(c));
ipcMain.on("win:setAlwaysOnTop", (_e, on) => setAlwaysOnTop(on));
ipcMain.on("win:setOpacity", (_e, v) => setOpacity(v));
ipcMain.on("win:flashFrame", () => { if (!win.isFocused()) win.flashFrame(true); });
ipcMain.on("app:setStartOnLogin", (_e, on) => setStartOnLogin(on));
ipcMain.on("app:applyPrefs", (_e, p) => applyPrefs(p));
ipcMain.on("app:openExternal", (_e, url) => openExternal(url));
ipcMain.on("app:quit", () => quit());

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                          */
/* ------------------------------------------------------------------ */

app.on("second-instance", showWindow);
app.on("before-quit", () => { quitting = true; if (win) ws.captureBounds(win); });

app.whenReady().then(() => {
  createWindow();
  createTray({
    getState: () => ws.get(),
    isVisible: () => !!(win && win.isVisible()),
    toggleVisible, setAlwaysOnTop, setStartOnLogin, quit,
  });
  // First launch of the installed app: start on login is on by default.
  if (ws.isFirstRun()) setStartOnLogin(true);
});

// Keep running in the tray when the window is hidden/closed.
app.on("window-all-closed", e => e.preventDefault());
