/**
 * Themes = sets of CSS variables applied to :root. Every colour in the app
 * (UI, pixel sprites, mascot) reads from these, so switching is instant.
 *
 * Variable roles:
 *   --bg/--sky      screen / scene background     --panel   cards, dialogue, inputs
 *   --line          sprite outlines (darkest)     --edge    UI borders
 *   --text/--muted  text                          --a1..a3  accents (tiles, bars, hearts)
 *   --frame/--frame-in  device bezel + inner strip
 *   --mascot --cloud --cloud-line --grass --grass-dark --dot  scene art
 *   --done/--review status colours
 */

export const PRESETS = {
  witch: {
    name: "Witch Cream", dark: false,
    vars: {
      bg: "#fff7d9", sky: "#fff7d9", panel: "#fffdf0", line: "#5b3f8c", edge: "#5b3f8c",
      text: "#4a3478", muted: "#6b52a0", a1: "#c9b2f0", a2: "#a6e6c8", a3: "#f6a3c4",
      frame: "#5b3f8c", "frame-in": "#fff7d9", mascot: "#ffffff",
      cloud: "#d9c8f5", "cloud-line": "#b79ce0", grass: "#bfe9b0", "grass-dark": "#5aa47a",
      dot: "#f28bb0", done: "#4f9e70", review: "#e0952a",
    },
  },
  rainy: {
    name: "Rainy Night", dark: true, rain: true,
    vars: {
      bg: "#2a2290", sky: "#231c6e", panel: "#1c1660", line: "#0f0b3e", edge: "#7b86f5",
      text: "#eef0ff", muted: "#a3b3ff", a1: "#7b86f5", a2: "#a3cbff", a3: "#ff45b0",
      frame: "#4a3de6", "frame-in": "#ffe6f0", mascot: "#ffe6f0",
      cloud: "#4a3de6", "cloud-line": "#0f0b3e", grass: "#5b66e0", "grass-dark": "#a3cbff",
      dot: "#ff45b0", done: "#8ff0c8", review: "#ffb3e6",
    },
  },
  matcha: {
    name: "Matcha Latte", dark: false,
    vars: {
      bg: "#eef3df", sky: "#e6efd4", panel: "#fbfdf4", line: "#2f4a2f", edge: "#2f4a2f",
      text: "#2f4a2f", muted: "#536f45", a1: "#b9d99a", a2: "#e8d7a8", a3: "#f3b6a0",
      frame: "#2f4a2f", "frame-in": "#eef3df", mascot: "#fffef6",
      cloud: "#ffffff", "cloud-line": "#9fbf87", grass: "#a8d48a", "grass-dark": "#3f7a3f",
      dot: "#8fbf6f", done: "#3f7a3f", review: "#c7782f",
    },
  },
  peach: {
    name: "Peach Soda", dark: false,
    vars: {
      bg: "#ffe9dc", sky: "#ffe2d1", panel: "#fff7f1", line: "#1f5c5c", edge: "#1f5c5c",
      text: "#1f4f4f", muted: "#3f6e69", a1: "#ffb59a", a2: "#8fd6cc", a3: "#ff8a95",
      frame: "#1f5c5c", "frame-in": "#ffe9dc", mascot: "#fffaf5",
      cloud: "#ffffff", "cloud-line": "#ffb59a", grass: "#9fdcb8", "grass-dark": "#2f7f6f",
      dot: "#ff8a95", done: "#2f7f6f", review: "#d9622f",
    },
  },
  gameboy: {
    name: "Pocket Green", dark: false,
    vars: {
      bg: "#9bbc0f", sky: "#9bbc0f", panel: "#8bac0f", line: "#0f380f", edge: "#0f380f",
      text: "#0f380f", muted: "#0f380f", a1: "#8bac0f", a2: "#8bac0f", a3: "#306230",
      frame: "#306230", "frame-in": "#9bbc0f", mascot: "#9bbc0f",
      cloud: "#8bac0f", "cloud-line": "#306230", grass: "#8bac0f", "grass-dark": "#0f380f",
      dot: "#306230", done: "#0f380f", review: "#306230",
    },
  },
  candy: {
    name: "Midnight Candy", dark: true,
    vars: {
      bg: "#15111f", sky: "#110d1a", panel: "#1f1930", line: "#08060d", edge: "#ff7ad9",
      text: "#f6eaff", muted: "#a99cc4", a1: "#ff7ad9", a2: "#6ef2ff", a3: "#ffe066",
      frame: "#2a2140", "frame-in": "#ff7ad9", mascot: "#f6eaff",
      cloud: "#2a2140", "cloud-line": "#6ef2ff", grass: "#2a2140", "grass-dark": "#6ef2ff",
      dot: "#6ef2ff", done: "#6ef2ff", review: "#ffe066",
    },
  },
};

export const DEFAULT_THEME = { preset: "witch", accent: "#c9b2f0", mode: "light" };

/** Build a full palette from one accent colour using CSS relative colour syntax. */
function customVars(accent, mode) {
  const A = accent || "#c9b2f0";
  const ok = (l, c, h = "h") => `oklch(from ${A} ${l} ${c} ${h})`;
  if (mode === "dark") {
    return {
      bg: ok(0.24, 0.06), sky: ok(0.2, 0.06), panel: ok(0.29, 0.07), line: ok(0.1, 0.04), edge: ok(0.7, 0.13),
      text: ok(0.96, 0.02), muted: ok(0.75, 0.06), a1: ok(0.7, 0.13), a2: ok(0.8, 0.1, "calc(h + 120)"), a3: ok(0.72, 0.17, "calc(h - 60)"),
      frame: ok(0.55, 0.14), "frame-in": ok(0.92, 0.03), mascot: ok(0.96, 0.02),
      cloud: ok(0.34, 0.07), "cloud-line": ok(0.7, 0.13), grass: ok(0.36, 0.07, "calc(h + 120)"), "grass-dark": ok(0.8, 0.1, "calc(h + 120)"),
      dot: ok(0.72, 0.17, "calc(h - 60)"), done: ok(0.82, 0.12, "calc(h + 120)"), review: "oklch(0.82 0.14 75)",
    };
  }
  return {
    bg: ok(0.97, 0.03), sky: ok(0.96, 0.035), panel: ok(0.99, 0.015), line: ok(0.33, 0.1), edge: ok(0.33, 0.1),
    text: ok(0.3, 0.09), muted: ok(0.47, 0.08), a1: ok(0.84, 0.09), a2: ok(0.87, 0.08, "calc(h + 120)"), a3: ok(0.82, 0.11, "calc(h - 60)"),
    frame: ok(0.33, 0.1), "frame-in": ok(0.97, 0.03), mascot: "#ffffff",
    cloud: ok(0.92, 0.05), "cloud-line": ok(0.78, 0.09), grass: ok(0.86, 0.09, "calc(h + 120)"), "grass-dark": ok(0.5, 0.1, "calc(h + 120)"),
    dot: ok(0.72, 0.14, "calc(h - 60)"), done: ok(0.5, 0.12, "calc(h + 120)"), review: "oklch(0.68 0.15 65)",
  };
}

/** Apply { preset, accent, mode } to the document. */
export function applyTheme(theme = DEFAULT_THEME) {
  const t = { ...DEFAULT_THEME, ...theme };
  const root = document.documentElement;
  let vars, dark, rain = false;
  if (t.preset === "custom") {
    vars = customVars(t.accent, t.mode);
    dark = t.mode === "dark";
  } else {
    const p = PRESETS[t.preset] || PRESETS.witch;
    vars = p.vars; dark = p.dark; rain = !!p.rain;
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty("--" + k, v);
  root.dataset.dark = dark ? "1" : "0";
  root.dataset.rain = rain ? "1" : "0";
  root.style.colorScheme = dark ? "dark" : "light";
}
