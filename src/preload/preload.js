/**
 * Preload: the ONLY bridge between the web page and Electron.
 *
 * contextBridge copies this object into the page as `window.juno`.
 * Each function is a narrow, named action — the page never gets ipcRenderer,
 * require, or any way to send arbitrary messages. Runs sandboxed, so this
 * file can only use `electron`'s renderer-safe modules (no local requires).
 */
const { contextBridge, ipcRenderer } = require("electron");

/** Subscribe to a main->renderer event; returns an unsubscribe function. */
function on(channel, cb) {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("juno", {
  getState: () => ipcRenderer.invoke("app:getState"),

  minimize: () => ipcRenderer.send("win:minimize"),
  hide: () => ipcRenderer.send("win:hide"),
  show: () => ipcRenderer.send("win:show"),
  setCollapsed: c => ipcRenderer.send("win:setCollapsed", !!c),
  setAlwaysOnTop: on => ipcRenderer.send("win:setAlwaysOnTop", !!on),
  setOpacity: v => ipcRenderer.send("win:setOpacity", Number(v)),
  flashFrame: () => ipcRenderer.send("win:flashFrame"),

  setStartOnLogin: on => ipcRenderer.send("app:setStartOnLogin", !!on),
  applyPrefs: p => ipcRenderer.send("app:applyPrefs", p),
  openExternal: url => ipcRenderer.send("app:openExternal", String(url)),
  quit: () => ipcRenderer.send("app:quit"),
  notify: (title, body) => ipcRenderer.send("app:notify", { title: String(title), body: String(body) }),
  setUnread: n => ipcRenderer.send("app:setUnread", Number(n) || 0),

  onState: cb => on("window:state", cb),
  onVisibility: cb => on("window:visibility", cb),
  onFocus: cb => on("window:focus", cb),
  onNavigate: cb => on("app:navigate", cb),
});
