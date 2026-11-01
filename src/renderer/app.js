/**
 * Stage 1 test page: proves the window controls, preload bridge and the
 * bundled plan.js all work. Replaced by the real pixel UI in stage 2.
 */
import { computeProgress, fmtWeeks } from "../data/plan.js";

const api = window.bytebun;
const root = document.getElementById("app");

root.innerHTML = `
  <div class="titlebar">
    <span class="title">BYTEBUN · stage 1</span>
    <button id="pin" title="Always on top">PIN</button>
    <button id="col" title="Collapse / expand">▭</button>
    <button id="min" title="Minimise">_</button>
    <button id="cls" title="Hide to tray">×</button>
  </div>
  <div class="body">
    <label>Opacity <input id="op" type="range" min="60" max="100"></label>
    <pre id="plan"></pre>
    <pre id="state"></pre>
  </div>`;

const $ = id => document.getElementById(id);
$("min").onclick = () => api.minimize();
$("cls").onclick = () => api.hide();
let st = {};
$("pin").onclick = () => api.setAlwaysOnTop(!st.alwaysOnTop);
$("col").onclick = () => api.setCollapsed(!st.isCollapsed);
$("op").oninput = e => api.setOpacity(e.target.value / 100);

function showState(s) {
  st = s;
  $("pin").textContent = s.alwaysOnTop ? "PIN ✓" : "PIN";
  $("op").value = Math.round(s.opacity * 100);
  $("state").textContent = "window state:\n" + JSON.stringify(s, null, 1);
}
api.getState().then(showState);
api.onState(showState);

const p = computeProgress({}, "sde", 1.5);
$("plan").textContent =
  `plan.js OK: ${p.total} items in SDE track, ≈ ${fmtWeeks(p.remWeeks)} at 1.5 h/day\n` +
  `current topic: ${p.currentTopic.title}`;
