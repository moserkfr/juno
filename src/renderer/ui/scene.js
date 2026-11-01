/**
 * The little world above the content: sky, clouds, sparkles, sun/moon,
 * grass, the mascot, and the dialogue box (buddy's latest message, or a
 * motivational line when there isn't one).
 */
import { h, raw } from "../core/dom.js";
import { cloud, sparkle, moon, sun, heart, sprout, flower } from "../art/sprites.js";
import { createMascot } from "../art/mascot.js";
import { avatarSVG } from "../art/avatars.js";

const LINES = [
  "One topic at a time. You've got this!",
  "Brute force first, then make it shine.",
  "Small steps still count as steps.",
  "Draw the recursion tree. Trust the tree.",
  "Re-solve today, remember forever.",
  "Every bug you fix is XP earned.",
  "Consistency beats intensity.",
  "Name the pattern, then write the code.",
];
/** Same line all day, a new one tomorrow. */
export const lineOfTheDay = () => LINES[Math.floor(Date.now() / 86_400_000) % LINES.length];

export function createScene({ onDialogueClick }) {
  const mascot = createMascot(4);
  const at = (node, style) => { const n = raw(node); n.classList.add("deco"); Object.assign(n.style, style); return n; };

  const sky = h("div.deco", { style: { right: "14px", top: "6px" } });
  const deco = [
    at(cloud(2), { left: "18px", top: "8px" }),
    at(cloud(2), { right: "60px", top: "4px", animationDelay: "-4s" }),
    at(sparkle(2), { left: "120px", top: "6px" }),
    at(sparkle(2, "--a1"), { right: "40px", top: "40px", animationDelay: "-1.2s" }),
    at(sparkle(2, "--a2"), { left: "70px", top: "28px", animationDelay: "-.6s" }),
    at(sprout(2), { left: "80px", bottom: "12px" }),
    at(flower(2), { right: "16px", bottom: "12px" }),
    at(flower(2), { right: "30px", bottom: "12px" }),
  ];

  // Rain drops (only visible in themes with data-rain="1")
  const rain = h("div.rainlayer", {},
    Array.from({ length: 14 }, (_, i) =>
      h("i", { style: { left: (i * 7.3 + 3) % 100 + "%", animationDelay: (-(i * 0.37) % 1.1) + "s" } })));

  const who = h("div.who");
  const say = h("p.say");
  const dialogue = h("div.dialogue.pbox", { onclick: onDialogueClick, title: "Open chat" },
    raw(sparkle(2, "--a3")), raw(sparkle(2, "--a1")), who, say,
    h("span.hrt", { html: heart(2) }));
  dialogue.children[0].classList.add("sp", "tl");
  dialogue.children[1].classList.add("sp", "br");

  const el = h("section.scene", { "aria-label": "Mascot" },
    rain, sky, deco, h("div.ground"), mascot.el, dialogue);

  /** Sun 6am–6pm, moon otherwise. */
  function updateSky() {
    const hr = new Date().getHours();
    const night = hr < 6 || hr >= 18;
    if (sky.dataset.night !== String(night)) {
      sky.dataset.night = String(night);
      sky.innerHTML = night ? moon(3) : sun(3);
    }
  }
  updateSky();
  setInterval(updateSky, 10 * 60_000);

  /** s.dialogue = { who, text, avatar? } | null */
  function update(s) {
    const d = s.dialogue;
    // Speaker portrait (buddy's character) + name. Name is a text node, never HTML.
    who.replaceChildren(
      ...(d && d.avatar !== undefined ? [raw(avatarSVG(d.avatar, 1, "head"))] : []),
      d ? d.who : "JUNO SAYS");
    say.textContent = d ? d.text : lineOfTheDay();
    mascot.setMood(s.mood || "idle");
  }

  return { el, update, mascot };
}
