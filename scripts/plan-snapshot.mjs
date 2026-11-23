/**
 * Saves the current plan as { subId: text } so later edits can be checked
 * against it (see scripts/check-plan.mjs). Run BEFORE editing plan.js:
 *   node scripts/plan-snapshot.mjs
 */
import { writeFileSync } from "fs";
import { PLAN, subId, subText } from "../src/data/plan.js";

const snap = {};
PLAN.forEach(ph => ph.topics.forEach(t => t.subs.forEach((s, i) => { snap[subId(t, i)] = subText(s); })));
writeFileSync(new URL("plan-snapshot.json", import.meta.url), JSON.stringify(snap, null, 1) + "\n");
console.log(`snapshot: ${Object.keys(snap).length} sub IDs across ${PLAN.reduce((a, p) => a + p.topics.length, 0)} topics`);
