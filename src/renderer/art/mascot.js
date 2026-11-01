/**
 * ByteBun, the mascot: an original mochi blob with a sprout.
 *
 * One body grid + small "paint" overlays for each face, so every expression
 * is guaranteed to line up. Animation = swapping the SVG every tick and
 * nudging it up/down a few art-pixels (bob / jump), with steps() timing so
 * it moves like a sprite, not a smooth tween.
 *
 *   const m = createMascot(4);   // 4 CSS px per art pixel -> 64x64
 *   m.setMood("idle" | "sleepy");
 *   m.celebrate();               // short happy jump + heart, then back
 */
import { pixelSVG, paint } from "./pixel.js";
import { heart } from "./sprites.js";

const BODY = [
  "................",
  "........ll......",
  ".......lLl......",
  "........l.......",
  ".....oooooo.....",
  "...oobbbbbboo...",
  "..obbbbbbbbbbo..",
  ".obbbbbbbbbbbbo.",
  ".obbbbbbbbbbbbo.",
  ".obbbbbbbbbbbbo.",
  ".obbbbbbbbbbbbo.",
  ".obbbbbbbbbbbbo.",
  "..obbbbbbbbbbo..",
  "...oooooooooo...",
];

const COLORS = {
  o: "--line", b: "--mascot", e: "--line", m: "--line",
  c: "--a3", t: "--a3", l: "--a2", L: "--grass-dark",
};

const CHEEKS = [[10, 3, "c"], [10, 12, "c"]];
const FACES = {
  idle:   paint(BODY, [[8, 4, "e"], [9, 4, "e"], [8, 11, "e"], [9, 11, "e"], [10, 7, "mm"], ...CHEEKS]),
  blink:  paint(BODY, [[9, 3, "ee"], [9, 11, "ee"], [10, 7, "mm"], ...CHEEKS]),
  happy:  paint(BODY, [[8, 4, "e"], [9, 3, "e_e"], [8, 11, "e"], [9, 10, "e_e"], [10, 6, "mmmm"], [11, 7, "tt"], ...CHEEKS]),
  sleepy: paint(BODY, [[9, 3, "eee"], [9, 10, "eee"], [11, 7, "m"], ...CHEEKS]),
};

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createMascot(scale = 4) {
  const el = document.createElement("div");
  el.className = "mascot";
  el.innerHTML = `<div class="mascot-fx"></div><div class="mascot-sprite"></div>`;
  const sprite = el.querySelector(".mascot-sprite");
  const fx = el.querySelector(".mascot-fx");

  let mood = "idle";      // base mood: idle | sleepy
  let happyUntil = 0;     // while now < happyUntil, show the happy animation
  let tick = 0;
  let lastFace = "";

  function draw(face, dy) {
    if (face !== lastFace) { sprite.innerHTML = pixelSVG(FACES[face], COLORS, scale); lastFace = face; }
    sprite.style.transform = `translateY(${dy * scale}px)`;
  }

  function step() {
    tick++;
    const still = reduceMotion();
    if (Date.now() < happyUntil) {
      const jump = [0, -2, -4, -5, -4, -2, 0, 0][tick % 8];
      draw("happy", still ? 0 : jump);
      return;
    }
    if (fx.dataset.kind === "heart") { fx.innerHTML = ""; fx.dataset.kind = ""; }
    if (mood === "sleepy") {
      draw("sleepy", still ? 0 : (tick % 6 < 3 ? 0 : 1)); // slow breathing
      if (fx.dataset.kind !== "zzz") { fx.innerHTML = `<span>z</span><span>z</span><span>Z</span>`; fx.dataset.kind = "zzz"; }
      return;
    }
    if (fx.dataset.kind === "zzz") { fx.innerHTML = ""; fx.dataset.kind = ""; }
    const blink = tick % 14 === 0;             // blink every ~4 s
    draw(blink ? "blink" : "idle", still ? 0 : (tick % 4 === 2 ? 1 : 0)); // gentle bob
  }

  const timer = setInterval(step, 280);
  step();

  return {
    el,
    setMood(m) { if (m !== mood) { mood = m; step(); } },
    celebrate() {
      happyUntil = Date.now() + 2000;
      tick = 0;
      fx.innerHTML = heart(3); fx.dataset.kind = "heart";
      step();
    },
    destroy() { clearInterval(timer); },
  };
}

/** Static single frame (for the collapsed pill or app icon previews). */
export const mascotSVG = (face = "idle", scale = 2) => pixelSVG(FACES[face], COLORS, scale);
