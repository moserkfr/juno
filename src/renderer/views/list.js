/**
 * LIST tab: the checklist.
 *   header  — overall % bar, "≈ X weeks left", track + hours selectors
 *   body    — phases -> collapsible topics -> subtopics with ✓ DONE / ★ REVIEW
 *             + topic detail (how to study, key problems, resources, self-check)
 *
 * The header is built once; the body is rebuilt only when items or prefs
 * change (cheap: collapsed topics don't render their subs). Which topics are
 * open is remembered in `open` so a rebuild never collapses what you opened.
 */
import { h, raw } from "../core/dom.js";
import { glyph, sparkle } from "../art/sprites.js";
import {
  TRACKS, HOURS, schedule, topicStats, subId, subText, subPdf, topicHasPdf, fmtWeeks,
} from "../../data/plan.js";

const ROLE = { both: ["Both", ""], sde: ["SDE", "t-sde"], top: ["Top-tier", "t-top"] };
const tag = (text, cls = "") => h("span.tag" + (cls ? "." + cls : ""), {}, text);

const open = new Set();        // topic ids expanded (survives tab switches)
let autoOpened = false;        // open the current topic once per app session

export const listView = {
  mount(el, { store, actions }) {
    const api = window.bytebun;

    /* ---------------- header ---------------- */
    const pctText = h("span.big");
    const countText = h("span.muted");
    const etaText = h("span.label");
    const fill = h("i");
    const trackBtns = TRACKS.map(t => h("button.pbtn.small", { title: t.hint, onclick: () => actions.setPrefs({ track: t.id }) }, t.short));
    const hourBtns = HOURS.map(hr => h("button.pbtn.small", { onclick: () => actions.setPrefs({ hours: hr }) }, hr + "h"));
    const header = h("section.card.pbox.lhead", {},
      h("div.row", {}, pctText, countText, h("span.grow"), etaText),
      h("div.pbar", {}, fill),
      h("div.row.controls", {}, h("span.label.clabel", {}, "TRACK"), h("div.seg", {}, trackBtns)),
      h("div.row.controls", {}, h("span.label.clabel", {}, "H/DAY"), h("div.seg", {}, hourBtns)),
    );
    const tools = h("div.row.tools", {},
      h("button.pbtn.small", { onclick: () => { scheduleNow().forEach(p => p.topics.forEach(t => open.add(t.id))); rebuild(store.get(), true); } }, "EXPAND ALL"),
      h("button.pbtn.small", { onclick: () => { open.clear(); rebuild(store.get(), true); } }, "COLLAPSE ALL"),
      h("span.grow"),
      h("button.pbtn.small", { onclick: () => jumpToCurrent() }, "▶ NOW"));
    const body = h("div.phases");
    el.append(header, tools, body);

    const scheduleNow = () => { const p = store.get().prefs; return schedule(p.track, p.hours); };

    /* ---------------- body ---------------- */

    function subRow(t, i, items) {
      const id = subId(t, i);
      const it = items[id] || {};
      const done = h("button.sbtn.done", {
        title: it.done ? "Mark not done" : "Mark done", "aria-pressed": String(!!it.done),
        onclick: () => actions.toggleDone(id),
      }, raw(glyph("check")));
      const rev = h("button.sbtn.rev", {
        title: it.review ? "Remove review flag" : "Flag for review", "aria-pressed": String(!!it.review),
        onclick: () => actions.toggleReview(id),
      }, "★");
      return h("li.sub" + (it.done ? ".is-done" : "") + (it.review ? ".is-review" : ""), {},
        h("span.stext.selectable", {}, subText(t.subs[i]), subPdf(t.subs[i]) ? tag("PDF", "t-pdf") : null),
        done, rev);
    }

    function detail(t) {
      return h("div.detail", {},
        h("div", {}, h("h4", {}, "HOW TO STUDY"), h("p.selectable", {}, t.method)),
        h("div", {}, h("h4", {}, "KEY PROBLEMS · ", h("span.muted", {}, "target " + t.target)),
          h("p.selectable", {}, t.probs.join(" · "))),
        h("div", {}, h("h4", {}, "RESOURCES"),
          h("ul.res", {}, t.res.map(r => h("li", {},
            h("button.link", { title: r.u, onclick: () => api.openExternal(r.u) }, "↗ " + r.n))))),
        h("div.selfcheck", {}, raw(sparkle(2)), h("p.selectable", {}, h("b", {}, "DONE WHEN: "), t.check)),
      );
    }

    function topicEl(t, items, s, currentId) {
      const st = topicStats(t, items);
      const isOpen = open.has(t.id);
      const isCurrent = t.id === currentId;
      const summary = h("button.tsum", {
        "aria-expanded": String(isOpen),
        onclick: () => { isOpen ? open.delete(t.id) : open.add(t.id); rebuild(store.get(), true); },
      },
        h("span.chev", { html: glyph(isOpen ? "chevD" : "chevR") }),
        h("span.ttl", {},
          h("span.tname", {}, t.title),
          h("span.tags", {},
            isCurrent ? tag("▶ NOW", "t-now") : null,
            topicHasPdf(t) ? tag("PDF", "t-pdf") : null,
            tag(...ROLE[t.role]))),
        h("span.tmeta", {},
          h("b", {}, `${st.done}/${st.total}`),
          st.review ? h("span.revc", { title: `${st.review} flagged for review` }, `★${st.review}`) : null,
          h("span.muted", {}, t.ongoing ? "ongoing" : fmtWeeks(t.w * (1.5 / s.prefs.hours)))),
      );
      const bar = h("div.pbar.thin", {}, h("i", { style: { width: (st.total ? (st.done / st.total) * 100 : 0) + "%" } }));
      return h("article.topic.pbox" + (st.complete ? ".complete" : "") + (isCurrent ? ".current" : ""),
        { dataset: { id: t.id } },
        summary, bar,
        isOpen ? h("div.tbody", {},
          h("h4", {}, "WHAT TO COVER"),
          h("ul.subs", {}, t.subs.map((_, i) => subRow(t, i, items))),
          detail(t)) : null);
    }

    function rebuild(s, keepScroll) {
      const top = el.scrollTop;
      const items = s.items || {};
      const currentId = s.progress.currentTopic?.id;
      if (!autoOpened && currentId) { open.add(currentId); autoOpened = "pending"; }
      body.replaceChildren(...schedule(s.prefs.track, s.prefs.hours).map(({ phase, index, topics, weeks, startWk, endWk }) =>
        h("section.phase", {},
          h("div.phead", {},
            h("span.pnum", {}, "PHASE " + index),
            h("h3", {}, phase.name),
            h("span.muted.pweeks", {}, weeks > 0 ? `wk ${startWk}–${endWk}` : "ongoing")),
          h("p.pgoal.muted", {}, phase.goal),
          topics.map(t => topicEl(t, items, s, currentId)))));
      if (keepScroll) el.scrollTop = top;
      if (autoOpened === "pending") { autoOpened = true; requestAnimationFrame(jumpToCurrent); }
    }

    function jumpToCurrent() {
      const id = store.get().progress.currentTopic?.id;
      if (!id) return;
      if (!open.has(id)) { open.add(id); rebuild(store.get(), true); }
      body.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "start" });
    }

    /* ---------------- update ---------------- */

    let last = {};
    function update(s) {
      const p = s.progress;
      pctText.textContent = p.pct + "%";
      countText.textContent = `${p.done}/${p.total} items`;
      etaText.textContent = p.remWeeks < 0.05 ? "ALL DONE!" : `≈ ${Math.round(p.remWeeks)} WK LEFT (${p.remMonths.toFixed(1)} MO)`;
      fill.style.width = p.pct + "%";
      trackBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(TRACKS[i].id === s.prefs.track)));
      hourBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(HOURS[i] === s.prefs.hours)));
      // Rebuild the body only if something it shows changed.
      if (s.items !== last.items || s.prefs.track !== last.track || s.prefs.hours !== last.hours) {
        rebuild(s, true);
        last = { items: s.items, track: s.prefs.track, hours: s.prefs.hours };
      }
    }
    update(store.get());
    return { update };
  },
};
