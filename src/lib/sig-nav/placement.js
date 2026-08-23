/**
 * Signature-nav placement engine — PURE (no DOM), unit-tested.
 *
 * All rects are `{x, y, w, h}` in document coordinates. `anchor` is the
 * signature image's rect; `size` is the flower box (`{w, h}`, stem base at the
 * box's bottom-centre). Obstacles carry `id` strings (`line:<n>`, `title`,
 * `author`, `nav`, `badge`, `flower:<k>`).
 *
 * The `author` obstacle (the whole "by ✍︎" line) is ignored here: the anchor IS
 * that line's signature, and the stem has to root on it. Instead the anchor
 * itself, minus its top `ROOT_OVERLAP` px, is an obstacle with id `anchor` —
 * a box may cover only the top 6 px of the signature image, where the stem
 * roots.
 *
 * @typedef {{ x: number, y: number, w: number, h: number }} Rect
 * @typedef {Rect & { id: string }} Obstacle
 * @typedef {{ w: number, h: number }} Size
 * @typedef {'above' | 'beside' | 'ragged' | 'gutter'} Strategy
 * @typedef {{ id: string, rect: Rect, origin: { x: number, y: number }, strategy: Strategy }} Candidate
 * @typedef {Candidate & { free: boolean, hits: string[] }} Tried
 * @typedef {{ anchor: Rect, obstacles?: Obstacle[], viewport?: Rect, size: Size, pageWidth: number, columnRight?: number }} Scene
 */

export const EDGE_PAD = 8; // page edge clearance
export const OBSTACLE_GAP = 4; // clearance from any text/nav/badge rect
export const ROOT_OVERLAP = 6; // px of the signature a flower box may cover
export const STEP = 8; // x/y scan step for candidate origins
export const SCALES = [1, 0.75, 0.55];
/** @type {Strategy[]} */
export const STRATEGIES = ['above', 'beside', 'ragged', 'gutter'];

/** mulberry32: the same PRNG family as src/lib/bloom/generate.js. @param {number} seed */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** True when `a` and `b` overlap once each is grown by `gap` px (touching edges do not count). @param {Rect} a @param {Rect} b */
export function intersects(a, b, gap = 0) {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

/** True when `inner` lies entirely inside `outer`. @param {Rect} outer @param {Rect} inner */
export function contains(outer, inner) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

/** Shift `rect` so it sits inside `vp` with `pad` clearance; an oversized rect pins to the top/left edge. @param {Rect} rect @param {Rect} vp */
export function clampToViewport(rect, vp, pad = 8) {
  const maxX = vp.x + vp.w - pad - rect.w;
  const maxY = vp.y + vp.h - pad - rect.h;
  return { ...rect, x: Math.max(vp.x + pad, Math.min(rect.x, maxX)), y: Math.max(vp.y + pad, Math.min(rect.y, maxY)) };
}

/** A box of `size` whose bottom-left corner is (x, bottom). @param {number} x @param {number} bottom @param {Size} size @returns {Rect} */
const boxAt = (x, bottom, size) => ({ x, y: bottom - size.h, w: size.w, h: size.h });

/** The poem's text lines (ids `line:<k>`), sorted so the lowest on the page is last. @param {Obstacle[]} obstacles */
const poemLines = (obstacles) => obstacles.filter((o) => o.id.startsWith('line:')).sort((a, b) => a.y + a.h - (b.y + b.h));

/**
 * Every placement the engine is willing to consider, in priority order:
 * above → beside → ragged → gutter. `columnRight` (the poem column's right
 * edge) bounds 'ragged' and is required for 'gutter' (absent ⇒ no gutter).
 * @param {Scene} scene @returns {Candidate[]}
 */
export function candidates({ anchor, obstacles = [], size, pageWidth, columnRight }) {
  /** @type {Candidate[]} */
  const out = [];
  const right = anchor.x + anchor.w;
  const maxX = pageWidth - EDGE_PAD - size.w;

  // 'above': box bottom on the anchor's top edge (+ROOT_OVERLAP), centred on an
  // origin scanned across the middle 70 % of the signature.
  const bottom = anchor.y + ROOT_OVERLAP;
  for (let ox = anchor.x + anchor.w * 0.15; ox <= anchor.x + anchor.w * 0.85 + 1e-6; ox += STEP) {
    out.push({ id: `above:${Math.round(ox)}`, strategy: 'above', rect: boxAt(ox - size.w / 2, bottom, size), origin: { x: ox, y: anchor.y } });
  }

  // 'beside': box to the right of the anchor, base on the signature baseline.
  const baseline = anchor.y + anchor.h * 0.85;
  for (let off = OBSTACLE_GAP; off <= OBSTACLE_GAP + STEP * 6; off += STEP) {
    const x = right + off;
    if (x > maxX) break;
    out.push({ id: `beside:${Math.round(x)}`, strategy: 'beside', rect: boxAt(x, baseline, size), origin: { x: right, y: baseline } });
  }

  // 'ragged': climbing the ragged right edge — for k = 1..4 the box's bottom
  // sits on the bottom of the k-th-from-last line and its left edge clears
  // every line its vertical band touches by 12 px; then x scans rightward,
  // staying inside the poem column (+16 px) so the gutter stays the gutter's.
  const originTR = { x: right, y: anchor.y };
  const lines = poemLines(obstacles);
  const raggedMaxX = columnRight !== undefined ? Math.min(maxX, columnRight + 16 - size.w) : maxX;
  for (let k = 1; k <= Math.min(4, lines.length); k++) {
    const line = lines[lines.length - k];
    const lineBottom = line.y + line.h;
    const band = { x: 0, y: lineBottom - size.h, w: Infinity, h: size.h };
    const end = Math.max(...lines.filter((l) => intersects(band, l, OBSTACLE_GAP)).map((l) => l.x + l.w));
    for (let x = end + 12; x <= raggedMaxX; x += STEP) {
      out.push({ id: `ragged:${k}:${Math.round(x)}`, strategy: 'ragged', rect: boxAt(x, lineBottom, size), origin: originTR });
    }
  }

  // 'gutter': right of the poem column, base walking up from the baseline ≤ 256 px.
  if (columnRight !== undefined) {
    for (let dy = 0; dy <= 256; dy += STEP * 2) {
      for (let x = columnRight + 16; x <= Math.min(maxX, columnRight + 16 + STEP * 3); x += STEP) {
        out.push({ id: `gutter:${Math.round(x)}:${dy}`, strategy: 'gutter', rect: boxAt(x, baseline - dy, size), origin: { x: right, y: baseline } });
      }
    }
  }
  return out;
}

/** Obstacle ids a candidate rect hits (empty ⇒ free). The anchor minus its top ROOT_OVERLAP px counts. @param {Rect} rect @param {Rect} anchor @param {Obstacle[]} obstacles @param {number} pageWidth */
function hitsOf(rect, anchor, obstacles, pageWidth) {
  const hits = [];
  if (rect.x < EDGE_PAD || rect.x + rect.w > pageWidth - EDGE_PAD || rect.y < EDGE_PAD) hits.push('edge');
  const sig = { x: anchor.x, y: anchor.y + ROOT_OVERLAP, w: anchor.w, h: anchor.h - ROOT_OVERLAP };
  if (sig.h > 0 && intersects(rect, sig)) hits.push('anchor');
  for (const o of obstacles) if (o.id !== 'author' && intersects(rect, o, OBSTACLE_GAP)) hits.push(o.id);
  return hits;
}

/**
 * Pick a placement: uniformly at random (rng) among the free candidates of
 * the first strategy that has any, preferring candidates inside the viewport
 * when that strategy has some. `placement` is null when nothing is free at
 * this size — the caller retries smaller (SCALES) and finally falls back.
 * @param {Scene & { rng?: () => number }} scene
 * @returns {{ placement: Candidate | null, free: Tried[], tried: Tried[] }}
 */
export function place({ anchor, obstacles = [], viewport, size, pageWidth, columnRight, rng = Math.random }) {
  const tried = candidates({ anchor, obstacles, size, pageWidth, columnRight }).map((c) => {
    const hits = hitsOf(c.rect, anchor, obstacles, pageWidth);
    return { ...c, hits, free: hits.length === 0 };
  });
  const free = tried.filter((c) => c.free);
  if (free.length === 0) return { placement: null, free, tried };
  const pool = free.filter((c) => c.strategy === free[0].strategy);
  const onScreen = viewport ? pool.filter((c) => contains(viewport, c.rect)) : [];
  const from = onScreen.length ? onScreen : pool;
  const { id, rect, origin, strategy } = from[Math.floor(rng() * from.length)];
  return { placement: { id, rect, origin, strategy }, free, tried };
}

/**
 * Free-candidate counts per strategy at each of SCALES — the "is there room
 * for another flower" reading.
 * @param {Scene} scene
 * @returns {{ sizes: { scale: number, strategies: Record<Strategy, number> }[] }}
 */
export function roomReport({ anchor, obstacles = [], viewport, size, pageWidth, columnRight }) {
  const sizes = SCALES.map((scale) => {
    const scaled = { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
    /** @type {Record<Strategy, number>} */
    const strategies = { above: 0, beside: 0, ragged: 0, gutter: 0 };
    for (const c of place({ anchor, obstacles, viewport, size: scaled, pageWidth, columnRight, rng: () => 0 }).free) strategies[c.strategy]++;
    return { scale, strategies };
  });
  return { sizes };
}
