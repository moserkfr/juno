/**
 * Player characters: original pixel sprites of the two users, drawn from a
 * description of their avatars (nothing copied from any image).
 *
 * Each sprite is drawn as its LEFT half (8 px) and mirrored to 16 px, then
 * asymmetric details (e.g. a hair clip) are painted on top. Skin, hair and
 * clothes use fixed colours on purpose — a theme must never recolour a person.
 *
 *   avatarSVG("ruhani", 3)          full body
 *   avatarSVG("manosh", 2, "head")  head-and-shoulders crop for chat/dialogue
 */
import { pixelSVG, paint } from "./pixel.js";
import { mascotSVG } from "./mascot.js";

const mirror = half => half.map(r => r + [...r].reverse().join(""));

/* ---------------- Ruhani: long black hair, red flower clip, pink dress ---------------- */

const RUHANI = paint(mirror([
  "........",
  "....oooo",
  "...ohhhh",
  "..ohhhhh",
  ".ohhhhhh",
  ".ohhHhhh",
  "ohhhssss",
  "ohhsssss",
  "ohhswess",
  "ohhswess",
  "ohhscsss",
  "ohhssssm",
  "ohhhssss",
  "ohhhhoss",
  "ohhhospp",
  "ohhospPp",
  ".oospppp",
  "..ospPpp",
  "..ospppp",
  "..oopPpp",
  "..oppppp",
  ".oPpPpPp",
  "..oooooo",
  "....osso",
  "....okko",
  "....oooo",
]), [
  [3, 1, "rr"], [4, 0, "rRr"], [5, 1, "r"],   // flower clip on her right side (viewer's left)
]);

/* ---------------- Manosh: grey beanie with pom, plaid jacket, orange top, jeans ---------------- */

const MANOSH = mirror([
  ".......o",
  "......og",
  ".....ooo",
  "....oggg",
  "...ogggg",
  "..oggggg",
  "..oggggg",
  ".oGGGGGG",
  ".oGGGGGG",
  "oSssssss",
  "oSsswess",
  "oSsswess",
  ".oscssss",
  "..ossssm",
  "...ossss",
  "...ooooo",
  "..ojbjyy",
  ".ojbjbyy",
  ".ojjbjyy",
  ".ojbjbyy",
  ".osbjbyy",
  "..oddddd",
  "..oddddD",
  "...oddo.",
  "...okko.",
  "...oooo.",
]);

const COLORS = {
  o: "--line",                                  // outline follows the theme
  h: "#2a2230", H: "#4b4256",                   // hair
  r: "#e0344f", R: "#ffd34d",                   // flower (petals / centre)
  e: "#3fa34d", w: "#ffffff", m: "#7a2e2e",     // green eyes, whites, mouth
  g: "#8a8a94", G: "#55555f",                   // beanie / cuff
  j: "#c8323c", b: "#2f4fa8", y: "#f08a24",     // plaid red/blue, orange top
  d: "#3a5fbf", D: "#24397a", k: "#2a2a2a",     // jeans, shoes
  p: "#f48fb1", P: "#d9608a",                   // dress
};
const SKIN = {
  ruhani: { s: "#b97a4f", S: "#9a603b", c: "#d98b7a" },
  manosh: { s: "#7a4a2c", S: "#5e3820", c: "#8f5638" },
};

const SPRITES = { ruhani: RUHANI, manosh: MANOSH };
const HEAD_ROWS = { ruhani: 15, manosh: 16 };   // where the head crop ends

export const AVATARS = [
  { id: "ruhani", name: "Ruhani" },
  { id: "manosh", name: "Manosh" },
  { id: "juno", name: "Juno" },
];

/** SVG string for a character. Unknown/unset ids fall back to Juno. */
export function avatarSVG(id, scale = 2, crop = "full") {
  const grid = SPRITES[id];
  if (!grid) return mascotSVG("idle", scale);
  const rows = crop === "head" ? grid.slice(0, HEAD_ROWS[id]) : grid;
  return pixelSVG(rows, { ...COLORS, ...SKIN[id] }, scale, "avatar");
}
