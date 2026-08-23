/**
 * Signature-nav measurement — DOM only (browser). Every rect is `{x, y, w, h}`
 * in DOCUMENT coordinates (client rect + scroll), which is what placement.js
 * consumes. No Svelte here so the same code can be injected into a page by a
 * capture/test harness.
 *
 * @typedef {import('./placement.js').Rect} Rect
 */

/** Union of two rects. @param {Rect} a @param {Rect} b @returns {Rect} */
const union = (a, b) => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/** Two fragments belong to the same text line when their vertical bands overlap by ≥ half the shorter one. @param {Rect} a @param {Rect} b */
const sameLine = (a, b) => Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) >= 0.5 * Math.min(a.h, b.h);

/**
 * One rect per rendered text line under `rootEl`: walks every text node with a
 * TreeWalker, takes a Range per node (`getClientRects()` gives one fragment per
 * line the node wraps across), drops whitespace-only nodes and empty fragments,
 * merges fragments that share a line, and inflates each line by `inflate` px.
 * Sorted top to bottom.
 * @param {Element} rootEl @returns {Rect[]}
 */
export function textLineRects(rootEl, inflate = 4) {
  const doc = rootEl.ownerDocument;
  const win = /** @type {Window} */ (doc.defaultView);
  const walker = doc.createTreeWalker(rootEl, 4 /* NodeFilter.SHOW_TEXT */);
  /** @type {Rect[]} */
  const fragments = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!/\S/.test(node.nodeValue || '')) continue;
    const range = doc.createRange();
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (r.width <= 0 || r.height <= 0) continue;
      fragments.push({ x: r.left + win.scrollX, y: r.top + win.scrollY, w: r.width, h: r.height });
    }
  }
  fragments.sort((a, b) => a.y - b.y || a.x - b.x);
  /** @type {Rect[]} */
  const lines = [];
  for (const f of fragments) {
    const last = lines[lines.length - 1];
    if (last && sameLine(last, f)) lines[lines.length - 1] = union(last, f);
    else lines.push(f);
  }
  return lines.map((l) => ({ x: l.x - inflate, y: l.y - inflate, w: l.w + 2 * inflate, h: l.h + 2 * inflate }));
}

/** An element's bounding box in document coordinates, inflated by `inflate` px. @param {Element} el @returns {Rect} */
export function docRect(el, inflate = 0) {
  const win = /** @type {Window} */ (el.ownerDocument.defaultView);
  const r = el.getBoundingClientRect();
  return { x: r.left + win.scrollX - inflate, y: r.top + win.scrollY - inflate, w: r.width + 2 * inflate, h: r.height + 2 * inflate };
}

/** The visible page area in document coordinates. @param {Window} [win] @returns {Rect} */
export function viewportRect(win = window) {
  return { x: win.scrollX, y: win.scrollY, w: win.innerWidth, h: win.innerHeight };
}
