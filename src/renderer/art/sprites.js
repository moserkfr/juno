/**
 * Original pixel sprites: nav icons, title-bar glyphs and scene decorations.
 * All drawn for this app (style inspired by handheld virtual-pet screens).
 *
 * Colour keys used everywhere:
 *   o = outline (--line)   w = light fill (--panel)   a/b/c = accents (--a1/--a2/--a3)
 *   t = text colour (--text)
 */
import { pixelSVG } from "./pixel.js";

const C = { o: "--line", w: "--panel", a: "--a1", b: "--a2", c: "--a3", t: "--text", s: "--sky" };

/* ---------------- nav icons (16x16) ---------------- */

const LIST = [
  "....oooooooo....",
  "...oawwwwwwao...",
  "..ooooooooooooo.",
  "..owwwwwwwwwwwo.",
  "..owcowwoooowwo.",
  "..owccowwwwwwwo.",
  "..owwwwwwwwwwwo.",
  "..owcowwoooowwo.",
  "..owccowwwwwwwo.",
  "..owwwwwwwwwwwo.",
  "..owoowwoooowwo.",
  "..owoowwwwwwwwo.",
  "..owwwwwwwwwwwo.",
  "..ooooooooooooo.",
  "................",
  "................",
];

const STAR = [
  "................",
  ".......oo.......",
  "......oaao......",
  "......oaao......",
  ".....oaaaao.....",
  "ooooooaaaaoooooo",
  "oaaaaaaaaaaaaaao",
  ".oaaaaaaaaaaaao.",
  "..oaaaaaaaaaao..",
  "...oaaaaaaaao...",
  "...oaaaaaaaao...",
  "..oaaaaooaaaao..",
  "..oaaaoo.oaaao..",
  ".oaaoo....ooaao.",
  ".ooo........ooo.",
  "................",
];

const BUDDY = [
  "................",
  "...oooo....oooo.",
  "..owwwwo..oaaaao",
  ".owwwwwwooaaaaao",
  ".owowwowooaoaoao",
  ".owcwwcwooacaaco",
  ".owwoowwooaaooao",
  ".owwwwwwooaaaaao",
  "..oooooo..oooooo",
  "................",
  "....oo.oo.......",
  "...occoccoo.....",
  "...occcccco.....",
  "....occcco......",
  ".....occo.......",
  "......oo........",
];

const CHAT = [
  "................",
  "..oooooooooooo..",
  ".owwwwwwwwwwwwo.",
  "owwwwwwwwwwwwwwo",
  "owwbbwwbbwwbbwwo",
  "owwbbwwbbwwbbwwo",
  "owwwwwwwwwwwwwwo",
  ".owwwwwwwwwwwwo.",
  "..oooowwoooooo..",
  ".....owo........",
  "....owo.........",
  "....oo..........",
  "................",
  "................",
  "................",
  "................",
];

const GEAR = [
  "................",
  "......oooo......",
  "..oo..oaao..oo..",
  ".oaaoooaaoooaao.",
  ".oaaaaaaaaaaaao.",
  "..oaaaaooaaaao..",
  "..oaaaowwoaaao..",
  "oooaaowwwwoaaooo",
  "oaaaaowwwwoaaaao",
  "oooaaaowwoaaaooo",
  "..oaaaaooaaaao..",
  "..oaaaaaaaaaao..",
  ".oaaoooaaoooaao.",
  ".oaao.oaao.oaao.",
  "..oo..oooo..oo..",
  "................",
];

const FLAG = [
  "................",
  "..oo............",
  "..oaoooooooo....",
  "..oaocccccccoo..",
  "..oaocwcccccco..",
  "..oaoccccccco...",
  "..oaocccccco....",
  "..oaoccccccco...",
  "..oaooccccccoo..",
  "..oao.oooooooo..",
  "..oao...........",
  "..oao...........",
  "..oao...........",
  ".ooaoo..........",
  "obbbbbo.........",
  "ooooooo.........",
];

export const NAV_ICONS = { list: LIST, goals: FLAG, review: STAR, buddy: BUDDY, chat: CHAT, settings: GEAR };
export const navIcon = (name, scale = 2) => pixelSVG(NAV_ICONS[name], C, scale);

/* ---------------- title-bar glyphs (7x7, colour = currentColor) ---------------- */

const G = { x: "currentColor" };
export const GLYPHS = {
  close:    ["x.....x", ".x...x.", "..x.x..", "...x...", "..x.x..", ".x...x.", "x.....x"],
  min:      [".......", ".......", ".......", ".......", ".......", "xxxxxxx", "xxxxxxx"],
  collapse: ["xxxxxxx", "x.....x", "x.....x", "xxxxxxx", ".......", ".......", "......."],
  expand:   ["xxxxxxx", "x.....x", "x.....x", "x.....x", "x.....x", "x.....x", "xxxxxxx"],
  pin:      [".xxxxx.", "..x.x..", "..x.x..", ".xx.xx.", "xxxxxxx", "...x...", "...x..."],
  back:     ["...x...", "..x....", ".x.....", "xxxxxxx", ".x.....", "..x....", "...x..."],
  chevR:    ["..x....", "..xx...", "..xxx..", "..xxxx.", "..xxx..", "..xx...", "..x...."],
  chevD:    [".......", "xxxxxxx", ".xxxxx.", "..xxx..", "...x...", ".......", "......."],
  check:    [".......", "......x", ".....xx", "x...xx.", "xx.xx..", ".xxx...", "..x...."],
  send:     ["x......", "xxx....", "xxxxx..", "xxxxxxx", "xxxxx..", "xxx....", "x......"],
};
export const glyph = (name, scale = 2) => pixelSVG(GLYPHS[name], G, scale, "glyph");

/* ---------------- small sprites ---------------- */

export const HEART = [
  ".oo.oo.",
  "occoc.o",
  "occccco",
  "occccco",
  ".occco.",
  "..oco..",
  "...o...",
];
export const heart = (scale = 2) => pixelSVG(HEART, { o: "--line", c: "--a3" }, scale, "heart");

const SPARKLE = ["..s..", "..s..", "sstss", "..s..", "..s.."];
export const sparkle = (scale = 2, color = "--a3") =>
  pixelSVG(SPARKLE, { s: color, t: "--panel" }, scale, "sparkle");

const CLOUD = [
  "......oooo..........",
  "....oowwwwoo..ooo...",
  "...owwwwwwwwooweewo.",
  ".oowwwwwwwwwwwwwwwo.",
  "owwwwwwwwwwwwwwwwwwo",
  ".oooooooooooooooooo.",
];
export const cloud = (scale = 2) => pixelSVG(CLOUD, { o: "--cloud-line", w: "--cloud", e: "--cloud" }, scale, "cloud");

const MOON = ["..ooo...", ".occo...", "occo....", "occo....", "occo....", "occco..o", ".occccoo", "..oooo.."];
export const moon = (scale = 2) => pixelSVG(MOON, { o: "--line", c: "--a2" }, scale, "moon");

const SUN = [
  "....c....",
  ".c.....c.",
  "...ooo...",
  "..occco..",
  "c.occco.c",
  "..occco..",
  "...ooo...",
  ".c.....c.",
  "....c....",
];
export const sun = (scale = 2) => pixelSVG(SUN, { o: "--line", c: "--a3" }, scale, "sun");

const SPROUT = ["..bb.", ".bbob", "bbo..", "..o..", "..o.."];
export const sprout = (scale = 2) => pixelSVG(SPROUT, { b: "--a2", o: "--grass-dark" }, scale, "sprout");

const FLOWER = [".c.", "cwc", ".c.", ".g.", ".g."];
export const flower = (scale = 2) => pixelSVG(FLOWER, { c: "--a3", w: "--panel", g: "--grass-dark" }, scale, "flower");
