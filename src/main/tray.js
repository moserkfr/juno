/**
 * System tray: the app's "home" while the window is hidden.
 * Click = show/hide. Right-click menu = show/hide, always-on-top,
 * start on login, quit (the only way to really exit).
 */
const { Tray, Menu } = require("electron");
const { makeIcon } = require("./pixelIcon");

let tray = null;
let actions = null;

function build() {
  const s = actions.getState();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: actions.isVisible() ? "Hide ByteBun" : "Show ByteBun", click: actions.toggleVisible },
    { type: "separator" },
    { label: "Always on top", type: "checkbox", checked: s.alwaysOnTop, click: m => actions.setAlwaysOnTop(m.checked) },
    { label: "Start on login", type: "checkbox", checked: s.startOnLogin, click: m => actions.setStartOnLogin(m.checked) },
    { type: "separator" },
    { label: "Quit", click: actions.quit },
  ]));
}

/** `a` = callbacks from main.js, so this file never touches the window directly. */
function createTray(a) {
  actions = a;
  tray = new Tray(makeIcon());
  tray.setToolTip("ByteBun");
  tray.on("click", actions.toggleVisible);
  build();
  return tray;
}

/** Rebuild the menu after any state change so the checkmarks stay truthful. */
function refreshTray() { if (tray) build(); }

module.exports = { createTray, refreshTray };
