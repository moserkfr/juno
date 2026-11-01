/**
 * Pixel title bar: the window's drag handle (CSS -webkit-app-region: drag)
 * plus pin (always-on-top), collapse, minimise and close-to-tray buttons.
 */
import { h, raw } from "../core/dom.js";
import { glyph } from "../art/sprites.js";
import { mascotSVG } from "../art/mascot.js";

export function createTitlebar(store) {
  const api = window.bytebun;
  const btn = (name, title, onclick, cls = "") =>
    h("button.tbtn" + cls, { title, "aria-label": title, onclick }, raw(glyph(name)));

  const pin = btn("pin", "Always on top", () => api.setAlwaysOnTop(!store.get().win.alwaysOnTop));
  const col = btn("collapse", "Collapse to pill", () => api.setCollapsed(true));

  const el = h("header.titlebar", {},
    h("div.brand", {}, raw(mascotSVG("idle", 1)), "BYTEBUN"),
    pin,
    // col  <- enabled in stage 10 (collapsed pill mode)
    btn("min", "Minimise", () => api.minimize()),
    btn("close", "Hide to tray", () => api.hide(), ".close"),
  );

  function update(s) {
    pin.classList.toggle("on", !!s.win.alwaysOnTop);
    pin.setAttribute("aria-pressed", String(!!s.win.alwaysOnTop));
  }
  return { el, update };
}
