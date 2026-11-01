/**
 * Bottom nav: square pixel tiles with labels (like CARE/PLAY/LEARN/MAGIC),
 * separated by dotted pixel lines. CHAT shows an unread badge.
 */
import { h, raw } from "../core/dom.js";
import { navIcon } from "../art/sprites.js";

export const TABS = [
  { id: "list", label: "LIST" },
  { id: "review", label: "REVIEW" },
  { id: "buddy", label: "BUDDY" },
  { id: "chat", label: "CHAT" },
  { id: "settings", label: "SET" },
];

export function createNav(onSelect) {
  const tiles = {};
  const badge = h("span.badge", { style: { display: "none" } });
  const kids = [];
  TABS.forEach((t, i) => {
    if (i) kids.push(h("div.dots.v"));
    tiles[t.id] = h("button.ntile", { onclick: () => onSelect(t.id), title: t.label, "aria-label": t.label },
      h("span.ico", { html: navIcon(t.id, 2) }),
      h("span.lbl", {}, t.label),
      t.id === "chat" ? badge : null);
    kids.push(tiles[t.id]);
  });
  const el = h("nav.nav", {}, kids);

  function update(s) {
    for (const [id, tile] of Object.entries(tiles)) {
      tile.classList.toggle("active", s.view === id);
      tile.setAttribute("aria-current", s.view === id ? "page" : "false");
    }
    badge.style.display = s.unread ? "" : "none";
    badge.textContent = s.unread > 9 ? "9+" : String(s.unread);
  }
  return { el, update };
}
