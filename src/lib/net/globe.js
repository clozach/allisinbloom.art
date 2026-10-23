// The globe: the Internet's hubs and the branches between them (src/lib/net/net.json,
// see DATA-LICENSE.md beside it), with Vercel's regions, the nodes that answer this
// site, among them. Pure geometry in, SVG path data out; the same code draws the
// first frame on the server and every turned frame in the browser.
//
// Orthographic projection in a 1000 × 1000 box, the sphere's radius 440. Branches
// are great-circle arcs sampled once at load into unit vectors (lifted a little off
// the surface in their middle, so the long ones read like flight paths); each frame
// only rotates and projects them. The hemisphere facing away is not drawn, except
// its hubs, faintly; an arc that crosses the limb is cut exactly at the limb.
import { NODES, nearestNode } from './nodes.js';
import net from './net.json' with { type: 'json' };

export const SIZE = 1000;
export const CX = 500;
export const CY = 500;
export const R = 440;
const RAD = Math.PI / 180;
const f = Math.round;

/** The data's licence and where its credits are read (kept in the page, see TheNet). */
export const LICENSE = String(net.license);
export const CREDITS = String(net.credits);

/** @type {{ lat: number, lon: number }[]} hub i; hubs 0..18 are Vercel's regions in NODES order */
export const HUBS = [];
for (let i = 0; i + 1 < net.n.length; i += 2) HUBS.push({ lon: net.n[i] / 10, lat: net.n[i + 1] / 10 });

/** @typedef {{ a: number, b: number, cables: number, terr: boolean, tether: boolean }} Link */
/** @type {Link[]} */
export const LINKS = [];
for (let i = 0; i + 2 < net.l.length; i += 3) {
  const t = net.l[i + 2];
  LINKS.push({ a: net.l[i], b: net.l[i + 1], cables: t >> 2, terr: ((t >> 1) & 1) === 1, tether: (t & 1) === 1 });
}

/** Which of Vercel's regions each hub is nearest to: the region's service region, hub by hub. */
export const REGION_OF = HUBS.map((h, i) => (i < NODES.length && NODES[i] ? NODES[i].code : nearestNode(h.lat, h.lon).code));

/** Hubs with a place of their own; the nodes after them are cable junctions at sea, drawn without a dot. */
export const HUB_COUNT = typeof net.h === 'number' ? net.h : HUBS.length;
export const COUNTS = { hubs: HUB_COUNT, links: LINKS.length };

/** Unit vector of a point on the sphere: x toward 0°E on the equator, z north. @param {number} lat @param {number} lon */
function unit(lat, lon) {
  const p = lat * RAD;
  const l = lon * RAD;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
}

const HUB_VEC = HUBS.map((h) => unit(h.lat, h.lon));

const SAMPLE_DEG = 8; // one segment per eight degrees of arc: a chord error under a pixel at the size shown
const MAX_SEG = 24;
const LIFT = 0.07; // a half-circumference arc rises to seven percent of the radius at its middle

/**
 * One arc, sampled: xyz triples, lifted, plus the arc's angle in degrees.
 * @param {number[]} u @param {number[]} v
 */
function sampleArc(u, v) {
  const dot = Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]));
  const d = Math.acos(dot);
  const deg = d / RAD;
  const n = Math.max(1, Math.min(MAX_SEG, Math.ceil(deg / SAMPLE_DEG)));
  const pts = new Float64Array((n + 1) * 3);
  const sd = Math.sin(d) || 1;
  const lift = LIFT * (d / Math.PI);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s0 = d < 1e-9 ? 1 - t : Math.sin((1 - t) * d) / sd;
    const s1 = d < 1e-9 ? t : Math.sin(t * d) / sd;
    const k = 1 + lift * Math.sin(Math.PI * t);
    pts[i * 3] = (s0 * u[0] + s1 * v[0]) * k;
    pts[i * 3 + 1] = (s0 * u[1] + s1 * v[1]) * k;
    pts[i * 3 + 2] = (s0 * u[2] + s1 * v[2]) * k;
  }
  return { pts, deg };
}

/** Every link's samples, computed once. */
const ARCS = LINKS.map((link) => ({ link, ...sampleArc(HUB_VEC[link.a] || [1, 0, 0], HUB_VEC[link.b] || [1, 0, 0]) }));

/**
 * The view's basis: east, north and the direction toward the viewer, for the point facing out.
 * @param {number} centerLat @param {number} centerLon
 */
function basis(centerLat, centerLon) {
  const p0 = centerLat * RAD;
  const l0 = centerLon * RAD;
  return {
    e: [-Math.sin(l0), Math.cos(l0), 0],
    n: [-Math.sin(p0) * Math.cos(l0), -Math.sin(p0) * Math.sin(l0), Math.cos(p0)],
    v: [Math.cos(p0) * Math.cos(l0), Math.cos(p0) * Math.sin(l0), Math.sin(p0)]
  };
}

/**
 * A projector for a view centred on (lat, lon): maps a point on the sphere to the
 * box, with `depth` > 0 for the hemisphere that faces the viewer.
 * @param {number} centerLat @param {number} centerLon
 */
export function projector(centerLat, centerLon) {
  const B = basis(centerLat, centerLon);
  /** @param {number} lat @param {number} lon */
  return (lat, lon) => {
    const [x, y, z] = unit(lat, lon);
    return {
      x: CX + R * (x * B.e[0] + y * B.e[1] + z * B.e[2]),
      y: CY - R * (x * B.n[0] + y * B.n[1] + z * B.n[2]),
      depth: x * B.v[0] + y * B.v[1] + z * B.v[2]
    };
  };
}

/**
 * Path data for one sampled arc in one view: only what faces the viewer, cut at the
 * limb. A lifted point past the limb still shows. Relative commands keep it short.
 * @param {{ e: number[], n: number[], v: number[] }} B @param {Float64Array} pts
 */
function arcPath(B, pts) {
  const count = pts.length / 3;
  let out = '';
  /** @type {[number, number, number, number, number, boolean] | null} */
  let prev = null; // [ex, ny, depth, X, Y, visible]
  let open = false;
  let px = 0;
  let py = 0;
  const emit = (/** @type {number} */ x, /** @type {number} */ y) => {
    const nx = f(x);
    const ny = f(y);
    if (!open) {
      out += `M${nx},${ny}`;
      open = true;
    } else if (nx !== px || ny !== py) out += `l${nx - px},${ny - py}`;
    px = nx;
    py = ny;
  };
  for (let i = 0; i < count; i++) {
    const x = pts[i * 3];
    const y = pts[i * 3 + 1];
    const z = pts[i * 3 + 2];
    const ex = x * B.e[0] + y * B.e[1] + z * B.e[2];
    const ny = x * B.n[0] + y * B.n[1] + z * B.n[2];
    const d = x * B.v[0] + y * B.v[1] + z * B.v[2];
    const X = CX + R * ex;
    const Y = CY - R * ny;
    const visible = d >= 0 || ex * ex + ny * ny >= 1;
    if (prev && prev[5] !== visible) {
      // the limb lies between the two samples: find where the drawn chord crosses it,
      // by bisection under the same visibility rule (a lifted point past the limb
      // still shows, so the boundary is not simply where the depth is zero)
      let lo = 0;
      let hi = 1;
      for (let k = 0; k < 16; k++) {
        const t = (lo + hi) / 2;
        const tx = prev[0] + (ex - prev[0]) * t;
        const ty = prev[1] + (ny - prev[1]) * t;
        const td = prev[2] + (d - prev[2]) * t;
        const tv = td >= 0 || tx * tx + ty * ty >= 1;
        if (tv === prev[5]) lo = t;
        else hi = t;
      }
      const t = (lo + hi) / 2;
      const lx = CX + R * (prev[0] + (ex - prev[0]) * t);
      const ly = CY - R * (prev[1] + (ny - prev[1]) * t);
      if (prev[5]) {
        emit(lx, ly); // leaving the viewer's side: finish at the limb
        open = false;
      } else {
        open = false; // arriving from behind: start at the limb
        emit(lx, ly);
      }
    }
    if (visible) emit(X, Y);
    prev = [ex, ny, d, X, Y, visible];
  }
  return out;
}

/** The stroke class of a link that is not glowing. @param {Link} l */
function kindOf(l) {
  if (l.tether) return 'tether';
  if (l.cables === 0) return 'terr';
  return l.cables >= 5 ? 'sub3' : l.cables >= 2 ? 'sub2' : 'sub1';
}

/**
 * Everything the globe draws for one view, as path data per stroke class.
 * @param {{ lat: number, lon: number, lit?: string | null, minTerrDeg?: number }} view
 *   lat/lon: the point facing the viewer; lit: the code of the region whose hubs and
 *   branches glow; minTerrDeg: backbone hops shorter than this many degrees are left
 *   out unless they touch the lit region (the server's first frame uses it to stay small)
 */
export function globe({ lat, lon, lit = null, minTerrDeg = 0 }) {
  const B = basis(lat, lon);
  /** @type {Record<string, string[]>} */
  const paths = { sub1: [], sub2: [], sub3: [], terr: [], tether: [], glowFull: [], glowHalf: [] };
  for (const { link, pts, deg } of ARCS) {
    const inA = lit !== null && REGION_OF[link.a] === lit;
    const inB = lit !== null && REGION_OF[link.b] === lit;
    if (!inA && !inB && link.terr && link.cables === 0 && !link.tether && deg < minTerrDeg) continue;
    const cls = inA && inB ? 'glowFull' : inA || inB ? 'glowHalf' : kindOf(link);
    const d = arcPath(B, pts);
    if (d) paths[cls].push(d);
  }
  /** @type {string[]} */
  const hubsFront = [];
  /** @type {string[]} */
  const hubsBack = [];
  /** @type {string[]} */
  const region = [];
  /** @type {string[]} */
  const regions = [];
  const litIndex = lit === null ? -1 : NODES.findIndex((n) => n.code === lit);
  /** @param {number[]} p */
  const place = ([x, y, z]) => {
    const ex = x * B.e[0] + y * B.e[1] + z * B.e[2];
    const ny = x * B.n[0] + y * B.n[1] + z * B.n[2];
    return { x: f(CX + R * ex), y: f(CY - R * ny), front: x * B.v[0] + y * B.v[1] + z * B.v[2] >= 0 };
  };
  /** @type {{ x: number, y: number, front: boolean } | null} */
  const litDot = litIndex >= 0 && HUB_VEC[litIndex] ? place(HUB_VEC[litIndex]) : null;
  HUB_VEC.forEach((p, i) => {
    if (i >= HUB_COUNT || (i === litIndex && litDot && litDot.front)) return;
    const q = place(p);
    const dot = `M${q.x},${q.y}h.01`;
    if (!q.front) hubsBack.push(dot);
    else if (i < NODES.length) regions.push(dot);
    else if (lit !== null && REGION_OF[i] === lit) region.push(dot);
    else hubsFront.push(dot);
  });
  return {
    arcs: { sub1: paths.sub1.join(''), sub2: paths.sub2.join(''), sub3: paths.sub3.join(''), terr: paths.terr.join(''), tether: paths.tether.join('') },
    glow: { full: paths.glowFull.join(''), half: paths.glowHalf.join('') },
    hubs: { front: hubsFront.join(''), back: hubsBack.join(''), region: region.join('') },
    regions: regions.join(''),
    litDot
  };
}

// The first frame as a picture. An inline SVG's shapes are not a "largest contentful
// paint" for the browser (nor is an <image> inside one), so a page that is only the
// globe has no paint to measure and Lighthouse gives it no performance score. The
// server therefore draws the frame once more as a data: image for an <img>, which is a
// paint, and the live SVG takes its place once it has painted. Colours are the page's
// theme tokens (src/routes/+layout.svelte).
const THEMES = {
  light: { ink: '#533737', accent: '#caa8d6', strong: '#b077c5' },
  dark: { ink: '#e4d4d2', accent: '#d3b3e0', strong: '#e2c8ee' }
};

/** Stroke per class: [width, opacity, dash]. Shared by the picture and the live SVG's CSS. @type {Record<string, [number, number, string]>} */
export const STROKES = {
  sub1: [1.2, 0.3, ''],
  sub2: [1.8, 0.45, ''],
  sub3: [2.6, 0.6, ''],
  terr: [0.9, 0.2, ''],
  tether: [1, 0.3, '6 6']
};

/**
 * One rendered frame as an SVG document in a data: URI, light or dark.
 * @param {ReturnType<typeof globe>} g @param {'light' | 'dark'} theme
 */
export function netImage(g, theme) {
  const c = THEMES[theme];
  const line = (/** @type {string} */ d, /** @type {string} */ stroke, /** @type {number} */ w, /** @type {number} */ o, /** @type {string} */ dash = '') =>
    d ? `<path d='${d}' fill='none' stroke='${stroke}' stroke-width='${w}' stroke-opacity='${o}'${dash ? ` stroke-dasharray='${dash}'` : ''}/>` : '';
  const dots = (/** @type {string} */ d, /** @type {string} */ stroke, /** @type {number} */ w, /** @type {number} */ o) =>
    d ? `<path d='${d}' fill='none' stroke='${stroke}' stroke-width='${w}' stroke-opacity='${o}' stroke-linecap='round'/>` : '';
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${SIZE} ${SIZE}'>` +
    `<circle cx='${CX}' cy='${CY}' r='${R}' fill='none' stroke='${c.ink}' stroke-opacity='0.3' stroke-width='1.5'/>` +
    dots(g.hubs.back, c.ink, 3, 0.1) +
    line(g.arcs.terr, c.ink, ...STROKES.terr) +
    line(g.arcs.tether, c.ink, ...STROKES.tether) +
    line(g.arcs.sub1, c.ink, ...STROKES.sub1) +
    line(g.arcs.sub2, c.ink, ...STROKES.sub2) +
    line(g.arcs.sub3, c.ink, ...STROKES.sub3) +
    `<g opacity='0.8'>` +
    line(g.glow.half, c.accent, 1.6, 0.6) +
    line(g.glow.full, c.strong, 2.2, 0.85) +
    dots(g.hubs.region, c.strong, 4.5, 0.9) +
    (g.litDot && g.litDot.front ? `<circle cx='${g.litDot.x}' cy='${g.litDot.y}' r='26' fill='${c.accent}' fill-opacity='0.5'/>` : '') +
    '</g>' +
    dots(g.hubs.front, c.ink, 3.5, 0.65) +
    dots(g.regions, c.ink, 7, 0.85) +
    (g.litDot && g.litDot.front ? `<circle cx='${g.litDot.x}' cy='${g.litDot.y}' r='8' fill='${c.strong}'/>` : '') +
    '</svg>';
  return 'data:image/svg+xml,' + svg.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/ /g, '%20');
}
