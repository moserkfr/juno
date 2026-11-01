/**
 * BUDDY tab (read-only): me vs my buddy, side by side.
 *   player cards — character, name, LV, % bar, current topic, ★ reviews, last active
 *   phases       — per-phase bars for both (each computed with THAT person's track/hours)
 *   feed         — "Ruhani finished Binary search · 2h ago"
 */
import { h, raw, ago, mount } from "../core/dom.js";
import { sparkle, heart, navIcon } from "../art/sprites.js";
import { avatarSVG } from "../art/avatars.js";
import { PLAN, TRACKS, computeProgress } from "../../data/plan.js";

const ONLINE_MS = 10 * 60_000;
const trackName = id => TRACKS.find(t => t.id === id)?.short || id;

/** Normalised person for display: { uid, name, avatar, prefs, p (progress), lastActive, me } */
function personFrom(s, uid) {
  if (uid === s.auth.user.uid) {
    return { uid, me: true, name: s.auth.user.displayName, avatar: s.prefs.avatar, prefs: s.prefs,
             p: s.progress, lastActive: Date.now() };
  }
  const o = s.people[uid];
  // THEIR items with THEIR settings. (summary is only a fallback while items load.)
  const p = o.items ? computeProgress(o.items, o.prefs.track, o.prefs.hours) : null;
  return { uid, me: false, name: o.displayName, avatar: o.prefs.avatar, prefs: o.prefs, p,
           summary: o.summary, lastActive: o.lastActive };
}

function playerCard(x) {
  const pct = x.p ? x.p.pct : x.summary?.pct ?? 0;
  const lv = x.p ? x.p.lv : x.summary?.lv ?? 0;
  const topic = x.p ? (x.p.currentTopic?.title || "All done!") : x.summary?.currentTopic || "…";
  const reviews = x.p ? x.p.reviewCount : x.summary?.reviewCount ?? 0;
  const online = x.me || (x.lastActive && Date.now() - x.lastActive < ONLINE_MS);
  return h("article.pcard.pbox" + (x.me ? ".me" : ""), {},
    h("div.pc-top", {},
      h("span.pc-av", { html: avatarSVG(x.avatar, 3) }),
      h("div.pc-id", {},
        h("b.pc-name", {}, x.name),
        h("span.label", {}, (x.me ? "YOU" : "BUDDY") + " · " + trackName(x.prefs.track) + " · " + x.prefs.hours + "H"),
        h("span.pc-lv", {}, "LV." + String(lv).padStart(2, "0")))),
    h("div.row.pc-pct", {}, h("div.pbar.grow", {}, h("i", { style: { width: pct + "%" } })), h("b", {}, pct + "%")),
    h("p.pc-now", {}, h("span.label", {}, "NOW "), topic),
    h("div.row.pc-foot", {},
      h("span.revc", {}, "★" + reviews),
      h("span.grow"),
      h("span.pc-seen" + (online ? ".on" : ""), {}, online ? "● ONLINE" : "seen " + ago(x.lastActive))));
}

/** Phase rows: union of phases in either person's track. */
function phaseTable(a, b) {
  const pa = Object.fromEntries((a.p?.phases || []).map(p => [p.id, p]));
  const pb = Object.fromEntries((b.p?.phases || []).map(p => [p.id, p]));
  const bar = p => p
    ? h("div.row.phbar", {}, h("div.pbar.grow", {}, h("i", { style: { width: p.pct + "%" } })), h("span.label", {}, p.pct + "%"))
    : h("div.phbar.none.label", { title: "Not in their track" }, "—");
  return h("section.card.pbox", {},
    h("h3", {}, "PHASES", h("span.grow"), h("span.legend", {}, a.name), h("span.legend.b", {}, b.name)),
    PLAN.filter(ph => pa[ph.id] || pb[ph.id]).map((ph, i) => h("div.phrow", {},
      h("span.phname", {}, `${PLAN.indexOf(ph)} · ${ph.name}`),
      bar(pa[ph.id]), bar(pb[ph.id]))));
}

function feed(s, names, avatars) {
  const events = Object.values(s.people).flatMap(o => o.feed || [])
    .sort((x, y) => (y.at || 0) - (x.at || 0)).slice(0, 20);
  return h("section.card.pbox", {},
    h("h3", {}, raw(sparkle(2, "--a3")), "ACTIVITY"),
    events.length
      ? h("ul.feed", {}, events.map(e => h("li", {},
          h("span.fav", { html: avatarSVG(avatars[e.uid], 1, "head") }),
          h("span.grow", {}, h("b", {}, e.uid === s.auth.user.uid ? "You" : names[e.uid] || "Buddy"), " " + e.text),
          h("span.muted.fago", {}, ago(e.at)))))
      : h("p.muted", {}, "Finish a topic and it shows up here."));
}

export const buddyView = {
  mount(el, { store }) {
    const body = h("div");
    el.append(h("div.vhead", {}, h("h2", {}, "BUDDY"), raw(heart(2))), body);

    let last = {};
    function update(s) {
      // Rebuild when buddy data, my progress, or my prefs change. Also refresh
      // the "seen 5m ago" text every minute via the timer below.
      if (s.people === last.people && s.progress === last.progress && s.prefs === last.prefs && !last.tick) return;
      last = { people: s.people, progress: s.progress, prefs: s.prefs };

      const myUid = s.auth.user.uid;
      const others = Object.keys(s.people || {}).filter(u => u !== myUid);
      const me = personFrom(s, myUid);
      if (!others.length) {
        mount(body,
          h("div.pcards", {}, playerCard(me),
            h("article.pcard.pbox.waiting.placeholder", {}, raw(navIcon("buddy", 3)),
              h("p", {}, "Waiting for your buddy to join..."))),
          h("p.muted", { style: { margin: "8px 2px" } }, "Send them the installer and they'll appear here once they sign up."));
        return;
      }
      // Most recently active buddy first (normally there's exactly one).
      others.sort((a, b) => (s.people[b].lastActive || 0) - (s.people[a].lastActive || 0));
      const buddies = others.map(u => personFrom(s, u));
      const names = Object.fromEntries(others.map(u => [u, s.people[u].displayName]));
      const avatars = { [myUid]: s.prefs.avatar, ...Object.fromEntries(others.map(u => [u, s.people[u].prefs.avatar])) };

      const top = el.scrollTop;
      mount(body,
        h("div.pcards", {}, playerCard(me), buddies.map(playerCard)),
        phaseTable(me, buddies[0]),
        feed(s, names, avatars));
      el.scrollTop = top;
    }

    const timer = setInterval(() => { last.tick = true; update(store.get()); }, 60_000);
    update(store.get());
    return { update, destroy: () => clearInterval(timer) };
  },
};
