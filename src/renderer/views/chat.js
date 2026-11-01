/**
 * CHAT tab: one shared conversation in pixel speech bubbles.
 *   - Enter sends, Shift+Enter = new line, 500 char max (counter near the limit)
 *   - quick buttons: SHARE PROGRESS ("I just finished X (23%)") and NUDGE ♥
 *   - day separators, timestamps, "sending…" for messages not yet on the server
 *   - sticks to the bottom when new messages arrive, unless you scrolled up
 *     (then a "▼ NEW" pill appears)
 *
 * The composer is built once and never re-rendered, so typing is never lost.
 */
import { h, raw, mount } from "../core/dom.js";
import { heart, glyph, sparkle } from "../art/sprites.js";
import { avatarSVG } from "../art/avatars.js";
import { PLAN, topicStats } from "../../data/plan.js";
import { MAX_LEN } from "../firebase/chat.js";

const NUDGE_COOLDOWN = 30_000;

const time = ms => new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
function dayLabel(ms) {
  const d = new Date(ms), t = new Date();
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "TODAY";
  if (d.toDateString() === y.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }).toUpperCase();
}

/** "I just finished <topic> (<x>%)" — the most recently completed topic, else the current one. */
export function progressLine(s) {
  let best = null, bestAt = 0;
  PLAN.forEach(ph => ph.topics.forEach(t => {
    if (!topicStats(t, s.items).complete) return;
    const at = Math.max(...t.subs.map((_, i) => s.items[`${t.id}-${i}`]?.updatedAt || 0));
    if (at > bestAt) { bestAt = at; best = t; }
  }));
  const pct = s.progress.pct;
  if (best) return `I just finished ${best.title} (${pct}%)`;
  return `I'm working on ${s.progress.currentTopic?.title || "my list"} (${pct}%)`;
}

export const chatView = {
  mount(el, { store, actions }) {
    el.classList.add("chatmode");
    const list = h("div.msgs", { role: "log", "aria-live": "polite" });
    const newPill = h("button.newpill.pbtn.small.accent", { style: { display: "none" }, onclick: () => toBottom(true) }, "▼ NEW");

    /* ---------------- composer ---------------- */
    const input = h("textarea.pinput.cinput", {
      rows: 1, maxLength: MAX_LEN, placeholder: "Say hi... (Enter to send)", "aria-label": "Message",
    });
    const counter = h("span.label.ccount");
    const send = h("button.pbtn.accent.csend", { title: "Send", "aria-label": "Send" }, raw(glyph("send")));
    let lastNudge = 0;
    const nudgeBtn = h("button.pbtn.small", { title: "Poke your buddy" }, raw(heart(2)), "NUDGE");
    const shareBtn = h("button.pbtn.small", { title: "Post your latest progress" }, raw(sparkle(2)), "SHARE PROGRESS");

    async function doSend(text, type = "text") {
      try {
        await actions.sendChat(text, type);
        return true;
      } catch { return false; } // actions.sendChat shows the error toast
    }

    input.addEventListener("keydown", async e => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        sendTyped();
      }
    });
    input.addEventListener("input", () => {
      const n = input.value.length;
      counter.textContent = n > MAX_LEN - 100 ? `${n}/${MAX_LEN}` : "";
    });
    send.onclick = sendTyped;
    async function sendTyped() {
      const text = input.value;
      if (!text.trim()) return;
      input.value = ""; counter.textContent = "";
      // Restore the text if sending failed, so nothing is lost.
      if (!(await doSend(text))) input.value = text;
      input.focus();
    }
    nudgeBtn.onclick = async () => {
      const wait = NUDGE_COOLDOWN - (Date.now() - lastNudge);
      if (wait > 0) { actions.toast("EASY THERE", `Next nudge in ${Math.ceil(wait / 1000)}s ♥`, "info"); return; }
      lastNudge = Date.now();
      doSend("♥ poke!", "nudge");
    };
    shareBtn.onclick = () => doSend(progressLine(store.get()), "progress");

    el.append(
      h("div.vhead", {}, h("h2", {}, "CHAT"), h("span.label.muted", {}, "LAST 200")),
      h("div.msgwrap", {}, list, newPill),
      h("div.composer", {},
        h("div.row.quick", {}, shareBtn, nudgeBtn, h("span.grow"), counter),
        h("div.row.crow", {}, input, send)),
    );
    requestAnimationFrame(() => input.focus());

    /* ---------------- messages ---------------- */

    const nearBottom = () => list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    function toBottom(force) {
      if (force || nearBottom()) list.scrollTop = list.scrollHeight;
      newPill.style.display = "none";
    }
    list.addEventListener("scroll", () => { if (nearBottom()) newPill.style.display = "none"; });

    function bubble(m, s, people) {
      const mine = m.uid === s.auth.user.uid;
      const avatar = mine ? s.prefs.avatar : people[m.uid]?.prefs?.avatar;
      const name = mine ? "You" : (people[m.uid]?.displayName || m.name);
      if (m.type === "nudge") {
        return h("div.nudge" + (m.pending ? ".pending" : ""), {},
          raw(heart(3)), h("span", {}, `${name} ${mine ? "poked" : "poked you"}!`), h("span.muted", {}, time(m.at)));
      }
      return h("div.msg" + (mine ? ".mine" : ".theirs") + (m.type === "progress" ? ".prog" : "") + (m.pending ? ".pending" : ""), {},
        mine ? null : h("span.mav", { html: avatarSVG(avatar, 2, "head") }),
        h("div.bubble", {},
          m.type === "progress" ? h("span.ptag.label", {}, "★ PROGRESS") : null,
          h("p.mtext.selectable", {}, m.text),   // text node: no HTML injection possible
          h("span.mtime", {}, m.pending ? "sending..." : time(m.at))));
    }

    // Bubbles only depend on names + characters, not on lastActive/chatReadAt
    // (which change every few minutes), so compare a small key instead.
    const looksKey = s => s.prefs.avatar + "|" + Object.values(s.people || {})
      .map(p => `${p.uid}:${p.displayName}:${p.prefs?.avatar}`).join(",");

    let last = {};
    function update(s) {
      const looks = looksKey(s);
      if (s.messages === last.messages && looks === last.looks) return;
      const grew = s.messages.length !== (last.messages?.length ?? -1) ||
                   s.messages.at(-1)?.id !== last.messages?.at(-1)?.id;
      const first = !last.messages;
      last = { messages: s.messages, looks };

      // Stick to the bottom if you were there, or if you just sent something.
      const mineNewest = grew && s.messages.at(-1)?.uid === s.auth.user.uid;
      const stick = first || mineNewest || nearBottom();
      const kids = [];
      let day = "";
      if (!s.messages.length) kids.push(h("p.muted.cempty", {}, "No messages yet. Say hi to your buddy!"));
      for (const m of s.messages) {
        const d = dayLabel(m.at);
        if (d !== day) { day = d; kids.push(h("div.dsep.label", {}, d)); }
        kids.push(bubble(m, s, s.people || {}));
      }
      const top = list.scrollTop;
      mount(list, kids);
      if (stick) toBottom(true);
      else {
        list.scrollTop = top;
        const lastMsg = s.messages.at(-1);
        if (grew && lastMsg && lastMsg.uid !== s.auth.user.uid) newPill.style.display = "";
      }
    }
    update(store.get());
    return { update, destroy: () => el.classList.remove("chatmode") };
  },
};
