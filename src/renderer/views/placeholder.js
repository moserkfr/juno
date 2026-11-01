/** Temporary view for tabs whose stage hasn't been built yet. */
import { h, raw } from "../core/dom.js";
import { navIcon } from "../art/sprites.js";

export const placeholder = (icon, title, text) => ({
  mount(el) {
    el.append(h("div.card.pbox.placeholder", {},
      raw(navIcon(icon, 3)),
      h("h2.label", {}, title),
      h("p", {}, text)));
    return {};
  },
});
