/**
 * Publish a new version that installed copies will auto-update to.
 *
 *   npm version patch      # 1.0.0 -> 1.0.1 (commits + tags)
 *   npm run release
 *
 * Steps: refuse if the tree is dirty or the version is already released,
 * push commits + tags, build minified, then electron-builder uploads
 * Juno-Setup-x.y.z.exe + latest.yml to a GitHub Release on moserkfr/juno.
 * The GitHub token comes from your existing `gh` login, is passed only to
 * this one child process, and is never printed or written to disk.
 */
const { execSync, spawnSync } = require("child_process");
const { version } = require("../package.json");

const sh = cmd => execSync(cmd, { encoding: "utf8" }).trim();
const fail = msg => { console.error("\n  ✗ " + msg + "\n"); process.exit(1); };

if (sh("git status --porcelain")) fail("Uncommitted changes. Commit them first so the release matches GitHub.");

const tag = "v" + version;
const exists = spawnSync("gh", ["release", "view", tag, "--repo", "moserkfr/juno"], { stdio: "ignore", shell: true }).status === 0;
if (exists) fail(`${tag} is already released. Bump first: npm version patch`);

console.log(`→ pushing commits and tags`);
sh("git push --follow-tags origin main");

console.log(`→ building ${tag}`);
if (spawnSync("node", ["scripts/build.mjs", "--prod"], { stdio: "inherit", shell: true }).status) fail("Build failed.");

let token;
try { token = sh("gh auth token"); } catch { fail("Not logged in to GitHub CLI. Run: gh auth login"); }

console.log(`→ packaging and publishing ${tag} to GitHub Releases`);
const r = spawnSync("npx", ["electron-builder", "--win", "--publish", "always"], {
  stdio: "inherit", shell: true, env: { ...process.env, GH_TOKEN: token },
});
if (r.status) fail("electron-builder failed (see above).");
console.log(`\n  ✓ ${tag} published. Installed copies pick it up within an hour, or right away via "Check for updates".\n`);
