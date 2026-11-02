/**
 * GOALS tab: a plain to-do list for your own goals ("solve 5 array problems",
 * "mock interview friday"). Synced with your account like the checklist.
 *   TO DO  — oldest first; ✓ marks done, ✕ deletes
 *   DONE   — newest first; ✓ again un-does it; "CLEAR DONE" removes them all
 * The input is built once and never re-rendered, so typing is never lost.
 */
import { h, raw, ago, mount } from "../core/dom.js";
import { glyph, sparkle, navIcon } from "../art/sprites.js";

export const GOAL_MAX = 120;

export const goalsView = {
  mount(el, { store, actions }) {
    const counts = h("span.label.muted");
    const input = h("input.pinput.ginput", {
      type: "text", maxLength: GOAL_MAX, placeholder: "+ new goal (e.g. 5 array problems)",
      "aria-label": "New goal",
      onkeydown: e => { if (e.key === "Enter") { e.preventDefault(); add(); } },
    });
    const body = h("div");
    el.append(
      h("div.vhead", {}, h("h2", {}, "GOALS"), counts),
      h("div.row.gadd", {}, input, h("button.pbtn.small.accent", { onclick: add }, "ADD")),
      body);

    function add() {
      const text = input.value.trim();
      if (!text) { input.focus(); return; }
      actions.addGoal(text);
      input.value = "";
      input.focus();
    }

    function row(id, g) {
      return h("li.sub.goal" + (g.done ? ".is-done" : ""), { dataset: { id } },
        h("span.stext.selectable", {}, h("span.gtext", {}, g.text),
          h("span.snote", {}, g.done ? "done " + ago(g.doneAt) : "added " + ago(g.createdAt))),
        h("button.sbtn.done", {
          title: g.done ? "Mark not done" : "Mark done", "aria-pressed": String(!!g.done),
          onclick: () => actions.toggleGoal(id),
        }, raw(glyph("check"))),
        h("button.sbtn.del", { title: "Delete goal", "aria-label": "Delete goal", onclick: () => actions.deleteGoal(id) },
          raw(glyph("close"))));
    }

    function rebuild(s) {
      const all = Object.entries(s.goals || {});
      const todo = all.filter(([, g]) => !g.done).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));
      const done = all.filter(([, g]) => g.done).sort((a, b) => (b[1].doneAt || 0) - (a[1].doneAt || 0));
      counts.textContent = `${done.length}/${all.length} DONE`;

      if (!all.length) {
        mount(body, h("div.card.pbox.placeholder", {},
          raw(navIcon("goals", 3)),
          h("h2.label", {}, "NO GOALS YET"),
          h("p", {}, "Add anything you want to get done: today's problems, a mock interview, a revision day.")));
        return;
      }

      mount(body,
        h("h3.rsec", {}, raw(sparkle(2, "--a3")), "TO DO"),
        todo.length ? h("ul.subs.card.pbox.glist", {}, todo.map(([id, g]) => row(id, g)))
          : h("p.muted.rempty", {}, "All goals done! Add another?"),
        done.length ? h("div.row.gdonehead", {},
          h("h3.rsec", {}, raw(sparkle(2, "--a1")), "DONE"),
          h("span.grow"),
          h("button.pbtn.small", { onclick: () => actions.clearDoneGoals() }, "CLEAR DONE")) : null,
        done.length ? h("ul.subs.card.pbox.glist", {}, done.map(([id, g]) => row(id, g))) : null);
    }

    let last = null;
    function update(s) {
      if (s.goals === last) return;
      last = s.goals;
      const top = el.scrollTop;
      rebuild(s);
      el.scrollTop = top;
    }
    update(store.get());
    return { update };
  },
};
