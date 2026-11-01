/**
 * Tiny DOM helper instead of a framework.
 *
 *   h("button.pbtn.small", { onclick: fn, title: "Hi" }, "Click", someNode)
 *
 * "tag.class.class" sets classes; on* props become event listeners; strings
 * become TEXT nodes (never HTML) — so user content like chat messages can't
 * inject markup. Only the explicit `html` prop sets innerHTML, and we only
 * pass it our own SVG sprites.
 */
export function h(tag, props, ...kids) {
  const [name, ...classes] = tag.split(".");
  const el = document.createElement(name || "div");
  if (classes.length) el.className = classes.join(" ");
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else if (k === "class") el.className += " " + v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k in el && typeof el[k] !== "function" && k !== "list") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  append(el, kids);
  return el;
}

function append(el, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Replace all children. */
export function mount(el, ...kids) { el.replaceChildren(); append(el, kids); return el; }

/** Parse a trusted SVG/HTML string (our sprites) into a node. */
export function raw(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

/** "2h ago" style relative time. */
export function ago(ms) {
  if (!ms) return "never";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}
