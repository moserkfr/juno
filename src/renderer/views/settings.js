/**
 * SET tab: theme preset / custom accent + light-dark, window options.
 * Account options (display name, sign out) are added in the auth stage.
 *
 * Built once on mount; update() only syncs control values, so dragging the
 * opacity slider is never interrupted by a re-render.
 */
import { h, raw } from "../core/dom.js";
import { PRESETS } from "../ui/themes.js";
import { sparkle } from "../art/sprites.js";
import { setDisplayName } from "../firebase/auth.js";
import { toast, explainError } from "../ui/toast.js";
import { createAvatarPicker } from "../ui/avatarPicker.js";

const SWATCH_KEYS = ["bg", "a1", "a2", "a3", "line"];

function toggle(label, getOn, onChange) {
  const sw = h("button.ptoggle", { role: "switch", "aria-label": label, onclick: () => onChange(!getOn()) });
  const row = h("div.row", {}, h("span.grow", {}, label), sw);
  return { row, sync: () => sw.setAttribute("aria-checked", String(!!getOn())) };
}

export const settingsView = {
  mount(el, { store, actions }) {
    const api = window.bytebun;
    const s0 = store.get();

    /* ---- theme presets ---- */
    const cards = {};
    const grid = h("div.themes", {});
    for (const [id, p] of Object.entries(PRESETS)) {
      cards[id] = h("button.tcard", {
        onclick: () => actions.setTheme({ ...store.get().prefs.theme, preset: id }),
        title: p.name,
      },
        h("span.sw", {}, SWATCH_KEYS.map(k => h("i", { style: { background: p.vars[k] } }))),
        p.name);
      grid.append(cards[id]);
    }

    /* ---- custom accent ---- */
    const picker = h("input.colorpick", {
      type: "color", value: s0.prefs.theme.accent, title: "Accent colour",
      oninput: e => actions.setTheme({ ...store.get().prefs.theme, preset: "custom", accent: e.target.value }),
    });
    const modeBtns = ["light", "dark"].map(m => h("button.pbtn.small", {
      onclick: () => actions.setTheme({ ...store.get().prefs.theme, preset: "custom", mode: m }),
    }, m.toUpperCase()));
    cards.custom = h("button.tcard", {
      onclick: () => actions.setTheme({ ...store.get().prefs.theme, preset: "custom" }),
    }, h("span.sw", {}, h("i", { style: { background: "var(--a1)" } })), "Custom");

    /* ---- window ---- */
    const opacity = h("input.prange.grow", {
      type: "range", min: 60, max: 100, step: 5, value: Math.round((s0.win.opacity || 1) * 100),
      oninput: e => { api.setOpacity(e.target.value / 100); opLabel.textContent = e.target.value + "%"; },
      "aria-label": "Window opacity",
    });
    const opLabel = h("span.label", {}, opacity.value + "%");
    const aot = toggle("Always on top", () => store.get().win.alwaysOnTop, v => api.setAlwaysOnTop(v));
    const sol = toggle("Start on login", () => store.get().win.startOnLogin, v => api.setStartOnLogin(v));

    const charPicker = createAvatarPicker(id => actions.setPrefs({ avatar: id }));

    /* ---- account ---- */
    const user = s0.auth.user;
    const nameIn = h("input.pinput.grow", { value: user.displayName, maxLength: 30, "aria-label": "Display name" });
    const saveName = async () => {
      const v = nameIn.value.trim();
      if (!v || v === store.get().auth.user.displayName) return;
      try {
        const n = await setDisplayName(v);
        store.set({ auth: { ...store.get().auth, user: { ...store.get().auth.user, displayName: n } } });
        toast("SAVED", "Display name updated.", "info");
      } catch (e) { toast("COULDN'T SAVE NAME", explainError(e), "error"); }
    };
    nameIn.addEventListener("change", saveName);
    nameIn.addEventListener("keydown", e => { if (e.key === "Enter") nameIn.blur(); });

    el.append(
      h("div.vhead", {}, h("h2", {}, "SETTINGS"), raw(sparkle(2))),
      h("section.card.pbox", {},
        h("h3", {}, "ACCOUNT"),
        h("div.row", {}, h("span", {}, "Name"), nameIn),
        h("div.row", {}, h("span.muted.grow.selectable", { style: { fontSize: "13px" } }, user.email),
          h("button.pbtn.small", { onclick: () => actions.signOut() }, "SIGN OUT"))),
      h("section.card.pbox", {}, h("h3", {}, "CHARACTER"), charPicker.el),
      h("section.card.pbox", {},
        h("h3", {}, "THEME"),
        grid,
        h("div.row", { style: { marginTop: "12px" } },
          cards.custom, h("span.grow"), picker, h("div.seg", {}, modeBtns))),
      h("section.card.pbox", {},
        h("h3", {}, "WINDOW"),
        h("div.row", {}, h("span", {}, "Opacity"), opacity, opLabel),
        aot.row, sol.row,
        h("p.muted", { style: { fontSize: "12px", marginTop: "6px" } },
          "Start on login only applies to the installed app.")),
    );

    function update(s) {
      const t = s.prefs.theme;
      for (const [id, c] of Object.entries(cards)) c.classList.toggle("active", t.preset === id);
      modeBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(t.preset === "custom" && t.mode === ["light", "dark"][i])));
      if (document.activeElement !== picker) picker.value = t.accent;
      if (document.activeElement !== opacity && s.win.opacity) {
        opacity.value = Math.round(s.win.opacity * 100);
        opLabel.textContent = opacity.value + "%";
      }
      aot.sync(); sol.sync();
      charPicker.update(s.prefs.avatar);
    }
    update(s0);
    return { update };
  },
};
