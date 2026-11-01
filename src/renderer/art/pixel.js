/**
 * Pixel-art engine: turns a character grid into a crisp inline SVG.
 *
 *   pixelSVG(["..o..", ".ooo."], { o: "--line" }, 3)
 *
 * Each character is one pixel; '.' or ' ' is transparent. Colours are CSS
 * variable names (or literal colours), so sprites re-colour with the theme.
 * Adjacent same-colour pixels in a row are merged into one rect-run, and all
 * runs of one colour go into a single <path>, so even a 32x32 sprite is tiny.
 */

/*
 * Colours are applied via CLASSES, not style="" attributes: our strict
 * Content-Security-Policy (style-src 'self') blocks inline style attributes
 * in markup. Each colour gets a generated rule like `.f-line{fill:var(--line)}`
 * inserted through the CSSOM (constructed stylesheet), which CSP allows.
 */
const sheet = new CSSStyleSheet();
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
const known = new Map(); // colour -> class name

function fillClass(c) {
  if (known.has(c)) return known.get(c);
  const cls = "f-" + (c === "currentColor" ? "cc" : c.replace(/^--/, "").replace(/[^a-z0-9-]/gi, ""));
  const css = c.startsWith("--") ? `var(${c})` : c;
  sheet.insertRule(`.${cls}{fill:${css}}`, sheet.cssRules.length);
  known.set(c, cls);
  return cls;
}

/**
 * @param {string[]} grid   rows of equal length
 * @param {Object}   colors char -> "--css-var" | "#hex"
 * @param {number}   scale  CSS px per art pixel (default 2)
 * @param {string}   cls    extra class on the <svg>
 */
export function pixelSVG(grid, colors, scale = 2, cls = "") {
  const h = grid.length;
  const w = Math.max(...grid.map(r => r.length));
  const paths = {}; // char -> path data
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === "." || ch === " " || !colors[ch]) { x++; continue; }
      let run = 1;
      while (row[x + run] === ch) run++;
      paths[ch] = (paths[ch] || "") + `M${x} ${y}h${run}v1h-${run}z`;
      x += run;
    }
  });
  const body = Object.entries(paths)
    .map(([ch, d]) => `<path d="${d}" class="${fillClass(colors[ch])}"/>`)
    .join("");
  return `<svg class="px ${cls}" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" ` +
         `shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
}

/** Same as pixelSVG but returns a DOM element. */
export function pixelEl(grid, colors, scale, cls) {
  const t = document.createElement("template");
  t.innerHTML = pixelSVG(grid, colors, scale, cls);
  return t.content.firstChild;
}

/**
 * Copy a grid and paint over it: overlay = [[row, col, "chars"], ...].
 * Used for mascot expressions (swap eyes/mouth on the same body).
 */
export function paint(grid, overlay) {
  const g = grid.map(r => [...r]);
  overlay.forEach(([y, x, s]) => [...s].forEach((ch, i) => { if (ch !== "_") g[y][x + i] = ch; }));
  return g.map(r => r.join(""));
}
