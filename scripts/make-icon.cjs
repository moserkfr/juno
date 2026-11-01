/**
 * Generates the app icon from pixel grids (original art, no image editor):
 *   build/icon.png  256x256
 *   build/icon.ico  16, 32, 64, 128, 256 (PNG-compressed entries)
 *
 * Only integer scaling, so every size stays perfectly crisp.
 * No dependencies: PNG = zlib-deflated RGBA rows + CRC'd chunks.
 *
 *   node scripts/make-icon.cjs
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// 32x32 tile: stepped-corner purple frame, cream inside, Juno centred, a sparkle.
// Juno itself (16x14) is drawn at 2x into the middle of this tile below.
const W = 32;
const PAL = {
  ".": null,
  F: [0x5b, 0x3f, 0x8c],  // frame (purple ink)
  T: [0xff, 0xf7, 0xd9],  // tile (cream)
  G: [0xbf, 0xe9, 0xb0],  // grass
  K: [0x5a, 0xa4, 0x7a],  // grass edge
  S: [0xf2, 0x8b, 0xb0],  // sparkle (pink)
  o: [0x5b, 0x3f, 0x8c], e: [0x5b, 0x3f, 0x8c], m: [0x5b, 0x3f, 0x8c],
  b: [0xff, 0xff, 0xff], c: [0xf2, 0x8b, 0xb0],
  l: [0x7f, 0xd1, 0xa8], L: [0x3e, 0x9a, 0x6e],
};

// Juno (same as src/main/pixelIcon.js, trimmed to its 14 drawn rows)
const JUNO = [
  "........ll......",
  ".......lLl......",
  "........l.......",
  ".....oooooo.....",
  "...oobbbbbboo...",
  "..obbbbbbbbbbo..",
  ".obbbbbbbbbbbbo.",
  ".obbbbbbbbbbbbo.",
  ".obbebbbbbbebbo.",
  ".obbebbbbbbebbo.",
  ".obcbbbmmbbbcbo.",
  ".obbbbbbbbbbbbo.",
  "..obbbbbbbbbbo..",
  "...oooooooooo...",
];

function tileGrid() {
  const g = Array.from({ length: W }, () => Array(W).fill("."));
  // Frame with stepped (pixel) corners: 2px border, corners cut by 2 steps.
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const cx = Math.min(x, W - 1 - x), cy = Math.min(y, W - 1 - y);
    if (cx + cy < 3) continue;                       // cut corner (transparent)
    g[y][x] = (cx < 2 || cy < 2 || cx + cy < 5) ? "F" : "T";
  }
  // Grass strip near the bottom
  for (let x = 2; x < W - 2; x++) { g[25][x] = "K"; for (let y = 26; y < 30; y++) g[y][x] = "G"; }
  for (let y = 26; y < 30; y++) for (let x = 2; x < W - 2; x++) {
    const cx = Math.min(x, W - 1 - x), cy = Math.min(y, W - 1 - y);
    if (cx + cy < 5) g[y][x] = cx + cy < 3 ? "." : "F";
  }
  // Sparkle top-left
  [[5, 6], [6, 5], [6, 6], [6, 7], [7, 6]].forEach(([y, x]) => (g[y][x] = "S"));
  // Juno at 1x, centred horizontally, feet on the grass line
  JUNO.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") g[12 + y][8 + x] = ch; }));
  return g;
}

/** Render a grid at integer scale -> RGBA buffer. */
function rgba(grid, scale) {
  const h = grid.length, w = grid[0].length, S = w * scale;
  const buf = Buffer.alloc(S * h * scale * 4);
  grid.forEach((row, y) => row.forEach((ch, x) => {
    const c = PAL[ch]; if (!c) return;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = ((y * scale + dy) * S + x * scale + dx) * 4;
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
    }
  }));
  return { buf, w: S, h: h * scale };
}

/* ---- minimal PNG encoder ---- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = b => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png({ buf, w, h }) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; buf.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---- ICO container holding PNG images (supported since Windows Vista) ---- */
function ico(pngs) {
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir[o] = size >= 256 ? 0 : size; dir[o + 1] = size >= 256 ? 0 : size; // 0 means 256
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([head, dir, ...pngs.map(p => p.data)]);
}

const tile = tileGrid();
// 16px: the 32-grid can't be halved crisply, so use Juno alone (16 wide) padded to 16x16.
const small = [["................"], ["................"], ...JUNO.map(r => [r])].map(r => [...r[0]]);
const out = path.join(__dirname, "..", "build");
fs.mkdirSync(out, { recursive: true });
const entries = [
  { size: 16, data: png(rgba(small, 1)) },
  { size: 32, data: png(rgba(tile, 1)) },
  { size: 64, data: png(rgba(tile, 2)) },
  { size: 128, data: png(rgba(tile, 4)) },
  { size: 256, data: png(rgba(tile, 8)) },
];
fs.writeFileSync(path.join(out, "icon.png"), entries.at(-1).data);
fs.writeFileSync(path.join(out, "icon.ico"), ico(entries));
console.log("wrote build/icon.png and build/icon.ico (" + entries.map(e => e.size).join(", ") + ")");
