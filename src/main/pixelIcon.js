/**
 * The tray icon, drawn from a 16x16 character grid (one char = one pixel).
 * Doing it in code instead of shipping a PNG keeps the art editable as text
 * and guarantees it's crisp: we hand Windows the exact pixels.
 */
const { nativeImage } = require("electron");

// ByteBun: a mochi blob with a sprout. '.' = transparent.
const GRID = [
  "................",
  "........ll......",
  ".......lLl......",
  "........l.......",
  ".....oooooo.....",
  "...oobbbbbboo...",
  "..obbbbbbbbbbo..",
  ".obbbbbbbbbbbbo.",
  ".obbebbbbbbebbo.",
  ".obbebbbbbbebbo.",
  ".obcbbbmmbbbcbo.",
  ".obbbbbbbbbbbbo.",
  "..obbbbbbbbbbo..",
  "...oooooooooo...",
  "................",
  "................",
];

const PALETTE = {
  o: [0x5b, 0x3f, 0x8c], // outline (purple ink)
  e: [0x5b, 0x3f, 0x8c], // eyes
  m: [0x5b, 0x3f, 0x8c], // mouth
  b: [0xff, 0xf7, 0xd9], // body (cream)
  c: [0xf2, 0x8b, 0xb0], // cheeks (pink)
  l: [0x7f, 0xd1, 0xa8], // leaf (mint)
  L: [0x3e, 0x9a, 0x6e], // leaf shade
};

/** Render GRID at `scale` (2 => 32x32) into a raw BGRA bitmap. */
function makeIcon(grid = GRID, scale = 2) {
  const size = grid.length * scale;
  const buf = Buffer.alloc(size * size * 4); // all zero = fully transparent
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    const rgb = PALETTE[ch];
    if (!rgb) return;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = ((y * scale + dy) * size + (x * scale + dx)) * 4;
      buf[i] = rgb[2]; buf[i + 1] = rgb[1]; buf[i + 2] = rgb[0]; buf[i + 3] = 255; // BGRA
    }
  }));
  // scaleFactor 2: Electron treats this as a 16x16 logical icon with 2x detail.
  return nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: scale });
}

module.exports = { makeIcon, GRID, PALETTE };
