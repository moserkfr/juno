/**
 * Collapsed mode: a ~300x70 pixel pill.
 *   [mascot] LV.07 [▮▮▮▯▯] 34%      [💬2] [⤢]
 *            ▶ Binary search
 * The whole pill drags the window; the mascot, badge and expand button don't.
 * Click the mascot or ⤢ to expand; click the badge to expand straight to CHAT.
 */
import { h, raw } from "../core/dom.js";
import { glyph, navIcon } from "../art/sprites.js";
import { createMascot } from "../art/mascot.js";

export function createPill({ onExpand }) {
  const mascot = createMascot(3);
  const lv = h("b.pl-lv");
  const cells = Array.from({ length: 5 }, () => h("i"));
  const pct = h("span.pl-pct");
  const topic = h("p.pl-topic");
  const badge = h("button.pl-badge", { title: "Open chat", onclick: () => onExpand("chat") },
    raw(navIcon("chat", 1)), h("span"));
  const el = h("div.pill", { style: { display: "none" } },
    h("button.pl-mascot", { title: "Expand", onclick: () => onExpand() }, mascot.el),
    h("div.pl-info", {},
      h("div.pl-row", {}, lv, h("div.battery", {}, h("div.cells", {}, cells), h("div.nub")), pct),
      topic),
    badge,
    h("button.tbtn.pl-exp", { title: "Expand", "aria-label": "Expand", onclick: () => onExpand() }, raw(glyph("expand"))),
  );

  function update(s) {
    const p = s.progress;
    lv.textContent = "LV." + String(p.lv).padStart(2, "0");
    const on = p.pct >= 100 ? 5 : Math.ceil((p.pct / 100) * 5);
    cells.forEach((c, i) => c.classList.toggle("on", i < on));
    pct.textContent = p.pct + "%";
    const signedIn = s.auth.status === "ready";
    topic.textContent = !signedIn ? "Sign in to start" : p.currentTopic ? "▶ " + p.currentTopic.title : "All done! ★";
    const n = s.unread || 0;
    badge.style.display = n ? "" : "none";
    badge.lastChild.textContent = n > 9 ? "9+" : String(n);
    mascot.setMood(s.mood || "idle");
  }

  return { el, update, mascot };
}
