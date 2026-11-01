/**
 * Status bar, like the handheld reference:
 *   LV.07 ♥    20/05  12:34 PM    [▮▮▮▯▯]
 * LV = topics completed in your track. Battery = overall %, in 5 pixel cells.
 */
import { h, raw } from "../core/dom.js";
import { heart } from "../art/sprites.js";

const CELLS = 5;

export function createStatusbar() {
  const lv = h("span", {}, "LV.00");
  const clock = h("span.clock");
  const cells = Array.from({ length: CELLS }, () => h("i"));
  const battery = h("div.battery", { title: "0%" }, h("div.cells", {}, cells), h("div.nub"));
  const el = h("div.status", {}, h("div.lv", {}, lv, raw(heart(2))), clock, battery);

  function tick() {
    const d = new Date();
    const date = d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    clock.textContent = `${date}  ${time}`;
  }
  tick();
  // Re-align to the start of each minute so the clock flips on time.
  setTimeout(() => { tick(); setInterval(tick, 60_000); }, 60_000 - (Date.now() % 60_000));

  function update(s) {
    const p = s.progress;
    lv.textContent = "LV." + String(p.lv).padStart(2, "0");
    lv.parentElement.title = `${p.lv} of ${p.topicsTotal} topics complete`;
    // Any progress lights the first cell; 100% lights all five.
    const on = p.pct >= 100 ? CELLS : Math.ceil((p.pct / 100) * CELLS);
    cells.forEach((c, i) => c.classList.toggle("on", i < on));
    battery.title = `${p.pct}% of your track done`;
    battery.classList.toggle("low", p.pct < 20);
  }
  return { el, update };
}
