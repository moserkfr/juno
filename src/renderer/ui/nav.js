/**
 * Bottom nav: square pixel tiles with labels (like CARE/PLAY/LEARN/MAGIC),
 * separated by dotted pixel lines.
 * Badges: REVIEW = items due today, CHAT = unread messages.
 */
import { h } from "../core/dom.js";
import { navIcon } from "../art/sprites.js";

export const TABS = [
  { id: "list", label: "LIST" },
  { id: "review", label: "REVIEW", badge: s => s.due },
  { id: "buddy", label: "BUDDY" },
  { id: "chat", label: "CHAT", badge: s => s.unread },
  { id: "settings", label: "SET" },
];

export function createNav(onSelect) {
  const tiles = {};
  const badges = {};
  const kids = [];
  TABS.forEach((t, i) => {
    if (i) kids.push(h("div.dots.v"));
    if (t.badge) badges[t.id] = h("span.badge", { style: { display: "none" } });
    tiles[t.id] = h("button.ntile", { onclick: () => onSelect(t.id), title: t.label, "aria-label": t.label },
      h("span.ico", { html: navIcon(t.id, 2) }),
      h("span.lbl", {}, t.label),
      badges[t.id] || null);
    kids.push(tiles[t.id]);
  });
  const el = h("nav.nav", {}, kids);

  /** s = app state plus derived counts { due, unread }. */
  function update(s) {
    for (const [id, tile] of Object.entries(tiles)) {
      tile.classList.toggle("active", s.view === id);
      tile.setAttribute("aria-current", s.view === id ? "page" : "false");
    }
    for (const t of TABS) {
      const b = badges[t.id];
      if (!b) continue;
      const n = t.badge(s) || 0;
      b.style.display = n ? "" : "none";
      b.textContent = n > 9 ? "9+" : String(n);
    }
  }
  return { el, update };
}
