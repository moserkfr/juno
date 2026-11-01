/**
 * Character picker: three cards (Ruhani / Manosh / Juno).
 * Used in SET and in the one-time "WHO ARE YOU?" card on LIST.
 * The choice is stored in prefs.avatar, so it syncs and your buddy sees it.
 */
import { h, raw } from "../core/dom.js";
import { AVATARS, avatarSVG } from "../art/avatars.js";

export function createAvatarPicker(onPick) {
  const cards = AVATARS.map(a => h("button.acard", { title: a.name, onclick: () => onPick(a.id) },
    h("span.aimg", { html: avatarSVG(a.id, 3) }), h("span.label", {}, a.name)));
  const el = h("div.apicker", {}, cards);
  return {
    el,
    update(current) {
      cards.forEach((c, i) => c.setAttribute("aria-pressed", String(AVATARS[i].id === current)));
    },
  };
}
