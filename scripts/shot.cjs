/**
 * Dev tool: renders the UI in every theme and saves PNG screenshots, so the
 * look can be checked without clicking through by hand.
 *   npx electron scripts/shot.cjs <outDir> [view]
 */
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const out = process.argv[2] || "shots";
const view = process.argv[3] || "settings";
const themes = process.env.SHOT_THEMES ? process.env.SHOT_THEMES.split(",") : ["witch", "rainy", "matcha", "peach", "gameboy", "candy", "custom-light", "custom-dark"];

const PILL = view === "pill";
ipcMain.handle("app:getState", () => ({ alwaysOnTop: true, opacity: 1, startOnLogin: true, isCollapsed: PILL }));
ipcMain.handle("app:updateReady", () => null);
for (const ch of ["win:minimize", "win:hide", "win:show", "win:setCollapsed", "win:setAlwaysOnTop",
                  "win:setOpacity", "app:setStartOnLogin", "app:applyPrefs", "app:openExternal", "app:notify", "app:setUnread", "win:flashFrame"]) ipcMain.on(ch, () => {});

app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  const win = new BrowserWindow({
    width: PILL ? 300 : 420, height: PILL ? 70 : 680, frame: false, show: false,
    webPreferences: { preload: path.join(__dirname, "../src/preload/preload.js"), contextIsolation: true, sandbox: true },
  });
  // Collect page errors into a file instead of stdout (a closed pipe would crash Electron).
  const logFile = path.join(out, "console.log");
  fs.writeFileSync(logFile, "");
  win.webContents.on("console-message", (_e, level, msg) => {
    if (level >= 2) fs.appendFileSync(logFile, msg + "\n");
  });
  await win.loadFile(path.join(__dirname, "../dist/index.html"), { hash: view === "auth" ? "" : "preview" });
  for (const t of themes) {
    const [preset, mode] = t.split("-");
    const theme = preset === "custom" ? { preset, mode, accent: "#ff8fb1" } : { preset };
    await win.webContents.executeJavaScript(
      `localStorage.setItem("juno.prefs", JSON.stringify({theme:${JSON.stringify(theme)}})); location.reload();`);
    await new Promise(r => win.webContents.once("did-finish-load", r));
    await win.webContents.executeJavaScript(
      `document.querySelector('.ntile[title="${view === "settings" ? "SET" : view.toUpperCase()}"]')?.click()`);
    await new Promise(r => setTimeout(r, 900));
    if (process.argv[4]) await win.webContents.executeJavaScript(process.argv[4]);
    await new Promise(r => setTimeout(r, 200));
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(out, `${t}.png`), img.toPNG());
  }
  await win.webContents.executeJavaScript(`localStorage.clear()`);
  app.quit();
});
