// garden.js — where the flower goes on THIS page. Measures the poem (DOM),
// asks the pure placement engine, retries smaller, falls back to 'above',
// and converts the document-coordinate answer into offsets relative to the
// `.author` line the garden hangs from. Browser only (call from onMount).

import { textLineRects, docRect, viewportRect } from './measure.js';
import { place, roomReport, mulberry32, SCALES, EDGE_PAD } from './placement.js';

/**
 * @typedef {import('./placement.js').Rect} Rect
 * @typedef {{ id: string, rect: Rect, origin: {x:number,y:number}, strategy: string, scale: number, fallback?: boolean }} Placement
 * @typedef {Rect & { id: string }} Obstacle
 */

/** The flower box at scale 1, sized to the signature (3:4, stem base at bottom-centre). @param {Rect} anchor */
export function flowerSize(anchor) {
  const h = Math.round(Math.min(170, Math.max(90, anchor.w * 1.1)));
  return { w: Math.round(h * 0.75), h };
}

/** @param {{w:number,h:number}} size @param {number} scale */
const scaledSize = (size, scale) => ({ w: Math.round(size.w * scale), h: Math.round(size.h * scale) });

/**
 * Everything a flower must not cover: each poem text line (inflated 4 px),
 * the title, the author line (the engine skips it — the stem roots there),
 * the bottom prev/next nav, and the ⌃ badge when it is showing.
 * @param {HTMLElement} authorEl @param {HTMLElement | null} badgeEl
 */
export function gatherObstacles(authorEl, badgeEl) {
  const poem = authorEl.closest('.poem') || document.body;
  /** @type {Obstacle[]} */
  const obstacles = [];
  const content = poem.querySelector('.poem-content');
  if (content) textLineRects(content, 4).forEach((r, i) => obstacles.push({ id: `line:${i}`, ...r }));
  const title = poem.querySelector('.poem-title');
  if (title) obstacles.push({ id: 'title', ...docRect(title) });
  obstacles.push({ id: 'author', ...docRect(authorEl) });
  const nav = document.querySelector('.poem-nav');
  if (nav) obstacles.push({ id: 'nav', ...docRect(nav) });
  if (badgeEl) obstacles.push({ id: 'badge', ...docRect(badgeEl) });
  return obstacles;
}

/**
 * Plan the garden: a placement (never null — the smallest 'above' spot,
 * clamped into the page, is the flagged fallback) plus the diagnostics the
 * test hook exposes (`free`, `tried`, `room`, the obstacle list).
 * @param {{ authorEl: HTMLElement, anchorEl: HTMLElement, badgeEl: HTMLElement | null, seed: number }} args
 * @returns {{ placement: Placement, diag: Record<string, any> }}
 */
export function plan({ authorEl, anchorEl, badgeEl, seed }) {
  const anchor = docRect(anchorEl);
  const obstacles = gatherObstacles(authorEl, badgeEl);
  const viewport = viewportRect();
  const pageWidth = document.documentElement.clientWidth;
  const column = authorEl.closest('.poem') || authorEl.closest('.poem-container');
  const columnRight = column ? docRect(column).x + docRect(column).w : undefined;
  const size = flowerSize(anchor);
  const rng = mulberry32(seed);
  const args = { anchor, obstacles, viewport, pageWidth, columnRight };

  let result = place({ ...args, size, rng });
  /** @type {Placement | null} */
  let placement = result.placement && { ...result.placement, scale: 1 };
  for (let i = 1; i < SCALES.length && !placement; i++) {
    result = place({ ...args, size: scaledSize(size, SCALES[i]), rng });
    placement = result.placement && { ...result.placement, scale: SCALES[i] };
  }
  if (!placement) {
    const small = scaledSize(size, SCALES[SCALES.length - 1]);
    const above = result.tried.find((c) => c.strategy === 'above') || {
      id: 'above:fallback',
      strategy: 'above',
      origin: { x: anchor.x + anchor.w / 2, y: anchor.y },
      rect: { x: anchor.x + anchor.w / 2 - small.w / 2, y: anchor.y - small.h, w: small.w, h: small.h }
    };
    const x = Math.max(EDGE_PAD, Math.min(above.rect.x, pageWidth - EDGE_PAD - small.w));
    const y = Math.max(EDGE_PAD, above.rect.y);
    placement = { id: above.id, strategy: 'above', origin: above.origin, rect: { ...above.rect, x, y }, scale: SCALES[SCALES.length - 1], fallback: true };
  }

  const room = roomReport({ ...args, size });
  return {
    placement,
    diag: { free: result.free, tried: result.tried, room, obstacles, anchor, size, pageWidth, viewport }
  };
}

/**
 * Document → `.author`-relative offsets (the garden is absolutely positioned
 * inside the author line).
 * @param {{x:number,y:number}} p @param {HTMLElement} authorEl
 */
export function toLocal(p, authorEl) {
  const a = docRect(authorEl);
  return { x: p.x - a.x, y: p.y - a.y };
}
