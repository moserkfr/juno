/**
 * Builds the renderer into dist/:
 *   src/renderer/app.js          -> dist/app.js     (all JS + npm deps like Firebase, bundled)
 *   src/renderer/styles/main.css -> dist/styles.css (CSS @imports inlined, fonts copied)
 *   src/renderer/index.html      -> dist/index.html
 *
 * Why bundle at all? With nodeIntegration off, the page can't import from
 * node_modules. esbuild resolves those imports into one file in ~50 ms.
 *
 *   node scripts/build.mjs           one-off build (dev: with sourcemaps)
 *   node scripts/build.mjs --prod    minified, no sourcemaps (used for packaging)
 *   node scripts/build.mjs --watch   rebuild on save
 */
import * as esbuild from "esbuild";
import fs from "node:fs/promises";

const prod = process.argv.includes("--prod") || process.env.NODE_ENV === "production";
const watch = process.argv.includes("--watch");

try { await fs.access("firebase.config.js"); }
catch {
  console.error("\n  Missing firebase.config.js — copy firebase.config.example.js and fill in your project's web config.\n");
  process.exit(1);
}

await fs.rm("dist", { recursive: true, force: true });
await fs.mkdir("dist", { recursive: true });

const options = {
  entryPoints: { app: "src/renderer/app.js", styles: "src/renderer/styles/main.css" },
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "chrome130",          // Electron 33's Chromium
  loader: { ".woff2": "file", ".woff": "file", ".png": "file" },
  assetNames: "assets/[name]",
  sourcemap: !prod,
  minify: prod,
  logLevel: "info",
};

await fs.copyFile("src/renderer/index.html", "dist/index.html");

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("watching src/renderer …");
} else {
  await esbuild.build(options);
}
