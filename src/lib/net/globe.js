// The wire-frame Earth, projected: pure geometry in, SVG path data out. The same
// code draws the first frame on the server and every dragged frame in the browser.
// Orthographic projection in a 1000 × 1000 box; the sphere's radius is 440.
import { NODES, nearestNode } from './nodes.js';

export const SIZE = 1000;
export const CX = 500;
export const CY = 500;
export const R = 440;
const RAD = Math.PI / 180;
const SUB = 5; // degrees between the sample points of a line

/** Whole units: a tenth of one is invisible at any size the globe is shown, and the path data stays small. @param {number} n */
const f = (n) => Math.round(n);

/**
 * A projector for a view centred on (lat, lon). It maps a point on the sphere to
 * the box, with `depth` > 0 for the hemisphere that faces the viewer.
 * @param {number} centerLat @param {number} centerLon
 */
export function projector(centerLat, centerLon) {
  const p0 = centerLat * RAD;
  const l0 = centerLon * RAD;
  const s0 = Math.sin(p0);
  const c0 = Math.cos(p0);
  /** @param {number} lat @param {number} lon */
  return (lat, lon) => {
    const p = lat * RAD;
    const dl = lon * RAD - l0;
    const cp = Math.cos(p);
    const sp = Math.sin(p);
    const cdl = Math.cos(dl);
    return {
      x: CX + R * cp * Math.sin(dl),
      y: CY - R * (c0 * sp - s0 * cp * cdl),
      depth: s0 * sp + c0 * cp * cdl
    };
  };
}

/**
 * Splits a sampled line into front and back path fragments at the limb.
 * @param {{x: number, y: number, depth: number}[]} points
 * @param {{ front: string[], back: string[] }} out
 */
function splitLine(points, out) {
  /** @type {{x: number, y: number}[]} */
  let run = [];
  let side = points[0].depth >= 0;
  const flush = () => {
    if (run.length > 1) (side ? out.front : out.back).push('M' + run.map((q) => `${f(q.x)},${f(q.y)}`).join(' '));
    run = [];
  };
  for (const q of points) {
    const s = q.depth >= 0;
    if (s !== side) {
      flush();
      side = s;
    }
    run.push(q);
  }
  flush();
}

/** @type {Map<number, Map<string, string>>} which node owns each grid cell, by grid step */
const owners = new Map();

/**
 * The node nearest each cell's centre, for a grid of `step` degrees. Depends only
 * on the grid, never on the view, so it is computed once per step.
 * @param {number} step
 */
export function cellOwners(step) {
  let m = owners.get(step);
  if (m) return m;
  m = new Map();
  for (let lat = -90; lat < 90; lat += step) {
    for (let lon = -180; lon < 180; lon += step) {
      m.set(`${lat},${lon}`, nearestNode(lat + step / 2, lon + step / 2).code);
    }
  }
  owners.set(step, m);
  return m;
}

/**
 * Everything the globe draws for one view.
 * @param {{ lat: number, lon: number, step?: number, cell?: number, lit?: string | null }} view
 *   lat/lon: the point facing the viewer; step: the mesh's spacing in degrees; cell: the
 *   finer grid the lit region is filled on (a divisor of step, so its cells sit between
 *   the mesh's lines); lit: the code of the node whose region glows, or null for none
 * @returns {{ front: string, back: string, dots: string, cells: string,
 *   nodes: { code: string, city: string, x: number, y: number, front: boolean }[] }}
 */
export function globe({ lat, lon, step = 15, cell = 5, lit = null }) {
  const proj = projector(lat, lon);
  /** @type {{ front: string[], back: string[] }} */
  const lines = { front: [], back: [] };

  // meridians, pole to pole
  for (let m = -180; m < 180; m += step) {
    const pts = [];
    for (let a = -90; a <= 90; a += SUB) pts.push(proj(a, m));
    splitLine(pts, lines);
  }
  // parallels, around the world (the poles are points, not lines)
  for (let a = -90 + step; a < 90; a += step) {
    const pts = [];
    for (let m = -180; m <= 180; m += SUB) pts.push(proj(a, m));
    splitLine(pts, lines);
  }

  // the mesh's own nodes: every visible crossing of a meridian and a parallel
  const dots = [];
  for (let a = -90 + step; a < 90; a += step) {
    for (let m = -180; m < 180; m += step) {
      const q = proj(a, m);
      if (q.depth > 0.02) dots.push(`M${f(q.x)},${f(q.y)}h.01`);
    }
  }

  // the lit node's service region: the cells it is nearest to, as one path
  const cells = [];
  if (lit) {
    const own = cellOwners(cell);
    const sub = Math.min(SUB, cell);
    for (let a = -90; a < 90; a += cell) {
      for (let m = -180; m < 180; m += cell) {
        if (own.get(`${a},${m}`) !== lit) continue;
        // walk the cell's edges at the lines' own sampling so the fill follows the mesh
        const ring = [];
        for (let x = m; x < m + cell; x += sub) ring.push(proj(a, x));
        for (let y = a; y < a + cell; y += sub) ring.push(proj(y, m + cell));
        for (let x = m + cell; x > m; x -= sub) ring.push(proj(a + cell, x));
        for (let y = a + cell; y > a; y -= sub) ring.push(proj(y, m));
        if (ring.every((q) => q.depth > 0.02)) cells.push('M' + ring.map((q) => `${f(q.x)},${f(q.y)}`).join(' ') + 'Z');
      }
    }
  }

  const nodes = NODES.map((n) => {
    const q = proj(n.lat, n.lon);
    return { code: n.code, city: n.city, x: f(q.x), y: f(q.y), front: q.depth >= 0 };
  });

  return { front: lines.front.join(''), back: lines.back.join(''), dots: dots.join(''), cells: cells.join(''), nodes };
}
