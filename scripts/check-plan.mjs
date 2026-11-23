/**
 * Proves a plan edit didn't break saved progress.
 * Progress is keyed by "topicId-index", so every ID in the snapshot taken
 * before the edit (scripts/plan-snapshot.json) must still exist and point to
 * the SAME text. Also checks topic IDs are unique (shared IDs = shared ticks).
 *
 *   node scripts/check-plan.mjs [path/to/plan.js]   (default: src/data/plan.js)
 */
import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";

const file = path.resolve(process.argv[2] || "src/data/plan.js");
const { PLAN, PLAN_VERSION, subId, subText } = await import(pathToFileURL(file).href);
const snap = JSON.parse(readFileSync(new URL("plan-snapshot.json", import.meta.url), "utf8"));

const now = {};
const topicIds = [];
PLAN.forEach(ph => ph.topics.forEach(t => {
  topicIds.push(t.id);
  t.subs.forEach((s, i) => { now[subId(t, i)] = subText(s); });
}));

const bad = [];
for (const [id, text] of Object.entries(snap)) {
  if (!(id in now)) bad.push(`MISSING  ${id}  (was "${text}")`);
  else if (now[id] !== text) bad.push(`CHANGED  ${id}\n    was: "${text}"\n    now: "${now[id]}"`);
}
const dupes = topicIds.filter((id, i) => topicIds.indexOf(id) !== i);
dupes.forEach(id => bad.push(`DUPLICATE topic id "${id}"`));

// Per-topic summary: which topics gained subs, which are brand new.
const oldCount = {};
Object.keys(snap).forEach(id => { const t = id.slice(0, id.lastIndexOf("-")); oldCount[t] = (oldCount[t] || 0) + 1; });
console.log(`plan: ${path.relative(process.cwd(), file)}   PLAN_VERSION = ${PLAN_VERSION}`);
PLAN.forEach(ph => ph.topics.forEach(t => {
  const was = oldCount[t.id] || 0;
  if (!was) console.log(`  NEW     ${t.id.padEnd(10)} ${t.subs.length} subs  (${ph.id}: ${t.title})`);
  else if (t.subs.length !== was) console.log(`  APPEND  ${t.id.padEnd(10)} ${was} → ${t.subs.length} subs`);
}));
const fieldsLeft = PLAN.flatMap(ph => ph.topics).filter(t => "method" in t || "check" in t).map(t => t.id);
if (fieldsLeft.length) bad.push(`method/check still on: ${fieldsLeft.join(", ")}`);

console.log(`\n  old IDs checked: ${Object.keys(snap).length}   still identical: ${Object.keys(snap).length - bad.filter(b => !b.startsWith("DUP") && !b.startsWith("method")).length}`);
console.log(`  total sub IDs now: ${Object.keys(now).length}   topics: ${topicIds.length}`);
if (bad.length) { console.error("\n✗ FAIL\n  " + bad.join("\n  ")); process.exit(1); }
console.log("\n✓ PASS: every old ID points to the same text; topic IDs are unique.");
