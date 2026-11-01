/**
 * REVIEW tab: everything flagged ★, with spaced reminders (+1 / +7 / +30 days).
 *   DUE TODAY  — overdue first; "REVIEWED" advances to the next interval
 *   LATER      — grouped by topic (plan order); "DONE EARLY" allowed
 *   finished   — after the 3rd review: "CLEAR ★" or "AGAIN" (new cycle)
 * Each card has an optional short note ("forgot the dummy node trick").
 */
import { h, raw, ago, mount } from "../core/dom.js";
import { sparkle, navIcon } from "../art/sprites.js";
import { PLAN, findSub } from "../../data/plan.js";
import { isDue, isFinished, startOfDay, DAY, INTERVALS } from "../../data/review.js";

const NOTE_MAX = 140;
const TOPIC_ORDER = {};
PLAN.forEach(ph => ph.topics.forEach(t => (TOPIC_ORDER[t.id] = Object.keys(TOPIC_ORDER).length)));

/** "due today" / "overdue 3d" / "in 6d" */
function dueText(it, now = Date.now()) {
  if (isFinished(it)) return "all reviews done";
  const days = Math.round((startOfDay(it.nextReviewAt) - startOfDay(now)) / DAY);
  if (days < 0) return `overdue ${-days}d`;
  if (days === 0) return "due today";
  return days === 1 ? "due tomorrow" : `in ${days}d`;
}

export const reviewView = {
  mount(el, { store, actions }) {
    const counts = h("span.label.muted");
    const body = h("div");
    el.append(h("div.vhead", {}, h("h2", {}, "REVIEW"), counts), body);

    // Keep the textarea you're typing in alive across re-renders.
    let editing = null;

    function card(id, it, { showTopic }) {
      const sub = findSub(id);
      if (!sub) return null; // stale id from an old plan version
      const due = isDue(it);
      const finished = isFinished(it);
      const stage = it.stage || 0;

      const note = h("textarea.pinput.note", {
        rows: 1, maxLength: NOTE_MAX, placeholder: "+ note (e.g. forgot the dummy node trick)",
        value: it.note || "", "aria-label": "Note",
        onfocus: () => (editing = id),
        onblur: e => {
          actions.setNote(id, e.target.value);
          // Clicking a button in this card blurs the note first. Rebuilding
          // right away would replace that button before the click lands.
          setTimeout(() => { if (editing === id) editing = null; update(store.get()); }, 300);
        },
        onkeydown: e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.target.blur(); } },
      });

      const pips = h("span.pips", { title: `${stage} of ${INTERVALS.length} reviews done` },
        INTERVALS.map((d, i) => h("i" + (i < stage ? ".on" : ""), { title: `+${d} day${d > 1 ? "s" : ""}` })));

      const buttons = finished
        ? [h("span.muted.small", {}, "Got it?"),
           h("button.pbtn.small.accent", { onclick: () => actions.toggleReview(id) }, "CLEAR ★"),
           h("button.pbtn.small", { onclick: () => actions.restartReview(id) }, "AGAIN")]
        : [h("button.pbtn.small" + (due ? ".accent" : ""), { onclick: () => actions.reviewItem(id) }, due ? "✓ REVIEWED" : "DONE EARLY"),
           h("button.pbtn.small", { title: "Remove the review flag", onclick: () => actions.toggleReview(id) }, "UNFLAG")];

      return h("article.rcard.pbox" + (due ? ".due" : "") + (finished ? ".finished" : ""), { dataset: { id } },
        showTopic ? h("div.rtopic.label", {}, sub.topic.title) : null,
        h("p.rtext.selectable", {}, sub.text),
        h("div.rmeta", {}, pips,
          h("span.rdue" + (due ? ".hot" : ""), {}, dueText(it)),
          h("span.grow"),
          h("span.muted", {}, "flagged " + ago(it.flaggedAt))),
        note,
        h("div.row.rbtns", {}, h("span.grow"), buttons));
    }

    function rebuild(s) {
      const items = s.items || {};
      const flagged = Object.entries(items).filter(([id, it]) => it.review && findSub(id));
      const dueList = flagged.filter(([, it]) => isDue(it) || isFinished(it))
        // most overdue first; finished cycles (no next date) at the end
        .sort((a, b) => (a[1].nextReviewAt ?? Infinity) - (b[1].nextReviewAt ?? Infinity));
      const later = flagged.filter(([, it]) => !isDue(it) && !isFinished(it));
      const dueCount = flagged.filter(([, it]) => isDue(it)).length;

      counts.textContent = `${dueCount} DUE · ${flagged.length} FLAGGED`;

      if (!flagged.length) {
        mount(body, h("div.card.pbox.placeholder", {},
          raw(navIcon("review", 3)),
          h("h2.label", {}, "NOTHING TO REVIEW"),
          h("p", {}, "Tap ★ on any subtopic in LIST to schedule reviews at +1, +7 and +30 days.")));
        return;
      }

      // LATER: group by topic, in plan order; inside a topic, soonest first.
      const groups = {};
      later.forEach(([id, it]) => { const t = findSub(id).topic; (groups[t.id] ||= { t, list: [] }).list.push([id, it]); });
      const groupEls = Object.values(groups)
        .sort((a, b) => TOPIC_ORDER[a.t.id] - TOPIC_ORDER[b.t.id])
        .map(({ t, list }) => h("section.rgroup", {},
          h("h3.rgh", {}, t.title, h("span.muted", {}, ` · ${list.length}`)),
          list.sort((a, b) => a[1].nextReviewAt - b[1].nextReviewAt).map(([id, it]) => card(id, it, { showTopic: false }))));

      mount(body, 
        h("h3.rsec", {}, raw(sparkle(2, "--a3")), "DUE TODAY"),
        dueList.length ? dueList.map(([id, it]) => card(id, it, { showTopic: true }))
          : h("p.muted.rempty", {}, "All caught up for today!"),
        later.length ? h("h3.rsec", {}, raw(sparkle(2, "--a1")), "LATER") : null,
        groupEls);
    }

    let lastItems = null;
    let stale = false;
    function update(s) {
      if (s.items === lastItems && !stale) return;
      // Don't rebuild under the user's cursor while they type a note;
      // remember we're stale and rebuild when the note loses focus.
      if (editing) { stale = true; return; }
      stale = false;
      lastItems = s.items;
      const top = el.scrollTop;
      rebuild(s);
      el.scrollTop = top;
    }
    update(store.get());
    return { update };
  },
};

/** Count of items due today (for the nav badge). */
export const dueCount = items => Object.values(items || {}).filter(it => isDue(it)).length;
