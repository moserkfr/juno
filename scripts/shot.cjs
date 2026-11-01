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
const themes = ["witch", "rainy", "matcha", "peach", "gameboy", "candy", "custom-light", "custom-dark"];

ipcMain.handle("app:getState", () => ({ alwaysOnTop: true, opacity: 1, startOnLogin: true, isCollapsed: false }));
for (const ch of ["win:minimize", "win:hide", "win:show", "win:setCollapsed", "win:setAlwaysOnTop",
                  "win:setOpacity", "app:setStartOnLogin", "app:applyPrefs", "app:openExternal"]) ipcMain.on(ch, () => {});

app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  const win = new BrowserWindow({
    width: 420, height: 680, frame: false, show: false,
    webPreferences: { preload: path.join(__dirname, "../src/preload/preload.js"), contextIsolation: true, sandbox: true },
  });
  // Collect page errors into a file instead of stdout (a closed pipe would crash Electron).
  const logFile = path.join(out, "console.log");
  fs.writeFileSync(logFile, "");
  win.webContents.on("console-message", (_e, level, msg) => {
    if (level >= 2) fs.appendFileSync(logFile, msg + "\n");
  });
  await win.loadFile(path.join(__dirname, "../dist/index.html"));
  for (const t of themes) {
    const [preset, mode] = t.split("-");
    const theme = preset === "custom" ? { preset, mode, accent: "#ff8fb1" } : { preset };
    await win.webContents.executeJavaScript(
      `localStorage.setItem("bytebun.prefs", JSON.stringify({theme:${JSON.stringify(theme)}})); location.reload();`);
    await new Promise(r => win.webContents.once("did-finish-load", r));
    await win.webContents.executeJavaScript(
      `document.querySelector('.ntile[title="${view === "settings" ? "SET" : view.toUpperCase()}"]')?.click()`);
    await new Promise(r => setTimeout(r, 900));
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(out, `${t}.png`), img.toPNG());
  }
  await win.webContents.executeJavaScript(`localStorage.clear()`);
  app.quit();
});
