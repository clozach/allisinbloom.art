// Builds the Net's data, src/lib/net/net.json: the Internet's public hubs and the
// real branches between them, small enough to ship with the page. Offline and
// deterministic: the same raw folder always gives the same bytes.
//   node scripts/net/build.mjs data/raw/<YYYY-MM-DD>   (default: the newest folder)
//
// Sources (fetched by scripts/net/fetch.mjs; licences in src/lib/net/DATA-LICENSE.md):
//   - TeleGeography's Submarine Cable Map as of 2021-06-29 (fork commit 85198ba3)
//   - the Internet Topology Zoo (Adelaide University, figshare 10.25909/30153949.v1)
//   - Vercel's nineteen regions, imported from src/lib/net/nodes.js (hubs 0..18)
//
// Output shape (a contract with the renderer; see the comment above writeOutputs):
//   {"v":1,"license":…,"credits":"/credits","h":hubs,"n":[lon10,lat10,…],"l":[a,b,t,…]}
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NODES } from '../../src/lib/net/nodes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NET = path.join(ROOT, 'src/lib/net');

const R_KM = 100; // a point joins the nearest hub within this distance, else founds one
const SNAP_KM = 30; // a cable segment's end within this of one of its landing points lands there
const ZOO_MAX_KM = 3000; // longer backbone adjacencies are IP overlays riding submarine routes, not land branches
const MAX_BYTES = 36000;
const LICENSE = 'https://creativecommons.org/licenses/by-nc-sa/3.0/';
const SNAPSHOT_DATE = '2021-06-29';

const ZOO_NETWORKS = ['Ntt', 'HurricaneElectric', 'Cogentco', 'Geant2012', 'Tinet',
  'DeutscheTelekom', 'HiberniaGlobal', 'BtNorthAmerica', 'BtEurope', 'BtAsiaPac',
  'BtLatinAmerica', 'Iij', 'Globenet', 'Interoute', 'Colt', 'GtsCe', 'TataNld', 'Abilene',
  'Aarnet', 'Canerie', 'Sinet', 'Cernet', 'Esnet', 'Packetexchange', 'Highwinds', 'Columbus',
  'Telcove', 'Sprint', 'Peer1', 'HostwayInternational'];

// ---------------------------------------------------------------------------------
// Geometry

const RAD = Math.PI / 180;
/** Great-circle distance in km. @param {number} lon1 @param {number} lat1 @param {number} lon2 @param {number} lat2 */
function km(lon1, lat1, lon2, lat2) {
  const h =
    Math.sin(((lat2 - lat1) * RAD) / 2) ** 2 +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lon2 - lon1) * RAD) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** @param {number} x */
const r2 = (x) => (Math.round(x * 100) / 100).toFixed(2);

/**
 * A branching unit's key: its coordinates rounded to 0.01°. Both sides of the
 * antimeridian (±180°) are one meridian, so a cable the map splits there still joins.
 * @param {number[]} p [lon, lat]
 */
function buKey(p) {
  let lon = r2(p[0]);
  if (lon === '-180.00') lon = '180.00';
  return `B${lon},${r2(p[1])}`;
}

// ---------------------------------------------------------------------------------
// Inputs

/** @param {string} dir @param {string} rel */
const readJson = (dir, rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
/** @param {Buffer} b */
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

function rawDir() {
  const arg = process.argv[2];
  if (arg) return path.resolve(arg);
  const base = path.join(ROOT, 'data/raw');
  const days = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort() : [];
  if (!days.length) throw new Error('no data/raw/<date> folder: run node scripts/net/fetch.mjs first');
  return path.join(base, days[days.length - 1]);
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const SNAPSHOT_MONTH = { year: 2021, month: 6 }; // the snapshot is of 2021-06-29

/**
 * When a cable entered (or was to enter) service: its year and month, the month null
 * when the record gives only a year, a quarter read as its first month; null when the
 * record gives no year ("n.a.").
 * @param {unknown} rfs e.g. "2019", "2021 October", "2021 Q3", "n.a."
 * @returns {{ year: number, month: number | null } | null}
 */
function serviceDate(rfs) {
  const s = String(rfs ?? '').toLowerCase();
  const y = /\b(\d{4})\b/.exec(s);
  if (!y) return null;
  const q = /\bq([1-4])\b/.exec(s);
  const m = MONTHS.findIndex((name) => new RegExp(`\\b${name}`).test(s));
  return { year: Number(y[1]), month: q ? (Number(q[1]) - 1) * 3 + 1 : m >= 0 ? m + 1 : null };
}

/**
 * Still planned at the snapshot: a service date after June 2021. A bare year counts as
 * in service during that year; a record with no date is kept.
 * @param {{ year: number, month: number | null } | null} d
 */
function plannedAtSnapshot(d) {
  if (!d) return false;
  if (d.year !== SNAPSHOT_MONTH.year) return d.year > SNAPSHOT_MONTH.year;
  return d.month !== null && d.month > SNAPSHOT_MONTH.month;
}

/** Landing points, one per landing_point_id, in file order. @param {string} dir */
function loadLandingPoints(dir) {
  const geo = readJson(dir, 'telegeography/api/v2/landing-point/landing-point-geo.json');
  /** @type {Map<number, { id: number, name: string, lon: number, lat: number }>} */
  const lps = new Map();
  let variants = 0;
  for (const f of geo.features) {
    const { id, name } = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const tbd = /^t\.b\.d\./i.test(name);
    const have = lps.get(id);
    if (have) variants++;
    // The geo file repeats some ids (per-cable variants within a kilometre of each
    // other, some named "t.b.d."); the first real-named one stands for the point.
    if (!have || (have.tbd && !tbd)) lps.set(id, { id, name, lon, lat, tbd });
  }
  return { lps, features: geo.features.length, variants };
}

/** @param {string} dir */
function loadCables(dir) {
  const folder = path.join(dir, 'telegeography/api/v2/cable');
  const files = fs.readdirSync(folder).filter((f) => f.endsWith('.json') && f !== 'all.json' && f !== 'cable-geo.json').sort();
  /** @type {Map<string, any>} */
  const cables = new Map();
  for (const f of files) {
    const c = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'));
    cables.set(c.id, c);
  }
  const geo = readJson(dir, 'telegeography/api/v2/cable/cable-geo.json');
  /** @type {Map<string, number[][][]>} */
  const lines = new Map();
  for (const f of geo.features) {
    const id = f.properties.slug ?? f.properties.id;
    const g = f.geometry;
    const ls = g.type === 'MultiLineString' ? g.coordinates : g.type === 'LineString' ? [g.coordinates] : [];
    if (!lines.has(id)) lines.set(id, []);
    lines.get(id)?.push(...ls);
  }
  return { cables, lines, geoFeatures: geo.features.length };
}

// ---------------------------------------------------------------------------------
// Submarine links. Each cable becomes a small graph of stops: landing points and
// junctions. A segment's end within 30 km of one of the cable's own landing points
// lands there; any other end is a junction. The 2021 map draws a branch as a line
// that ends ON its trunk (a T-junction, not a shared end), draws some branches from
// landing to landing through a vertex on the trunk, and draws some landing points as
// places a line passes through. So a loose end becomes a stop on the nearest other
// line of its cable within JUNCTION_KM (or, failing that, REACH_KM) where it touches;
// a vertex within JUNCTION_KM of another line of the cable becomes a stop on both;
// and a landing point no segment ends at becomes a stop on the line that passes
// nearest it (within 30 km). Along each line, in route order, each stop links to the
// next: a trunk is a chain junction → junction → landing, a branch is junction →
// landing. Junctions of one cable within MERGE_KM of each other merge, and fragments
// no landing point reaches are dropped. (main() then joins junctions near a hub to
// it, and removes dead ends and pass-through junctions.)

const JUNCTION_KM = 5; // a loose end or a vertex this close to another line of its cable is a junction on it
const REACH_KM = 15; // a loose end still unjoined reaches the nearest line of its cable within this
const MERGE_KM = 25;
const MAX_LOST_BRANCHES = 3; // branches to a landing point lost as dead ends: a regression shows here

/** @param {number[]} p [lon, lat] @returns {[number, number, number]} */
function vec(p) {
  const lo = p[0] * RAD;
  const la = p[1] * RAD;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}
/** @param {number[]} a @param {number[]} b */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** @param {number[]} a @param {number[]} b */
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

/**
 * Nearest point of a polyline to p: distance in km and position s along the line
 * (vertex index plus the fraction of the next segment).
 * @param {number[]} p @param {number[][]} line
 */
function nearestOnLine(p, line) {
  const P = vec(p);
  let best = { km: Infinity, s: 0 };
  for (let k = 0; k < line.length - 1; k++) {
    const A = vec(line[k]);
    const B = vec(line[k + 1]);
    const ab = ang(A, B);
    let t = 0;
    let d;
    const n = [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]];
    const nn = Math.hypot(n[0], n[1], n[2]);
    if (nn > 1e-12 && ab > 1e-12) {
      const sp = dot(P, n) / nn;
      const C = [P[0] - (sp * n[0]) / nn, P[1] - (sp * n[1]) / nn, P[2] - (sp * n[2]) / nn];
      const cn = Math.hypot(C[0], C[1], C[2]);
      if (cn > 1e-12) {
        const U = [C[0] / cn, C[1] / cn, C[2] / cn];
        const ac = ang(A, U);
        if (Math.abs(ac + ang(U, B) - ab) < 1e-9) {
          t = ac / ab;
          d = ang(P, U);
        }
      }
    }
    if (d === undefined) {
      const da = ang(P, A);
      const db = ang(P, B);
      [d, t] = da <= db ? [da, 0] : [db, 1];
    }
    const dk = d * 6371;
    if (dk < best.km) best = { km: dk, s: k + t };
  }
  return best;
}

/** A line's extent in degrees. @param {number[][]} line */
function bbox(line) {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lo, la] of line) [w, s, e, n] = [Math.min(w, lo), Math.min(s, la), Math.max(e, lo), Math.max(n, la)];
  return { w, s, e, n };
}

/**
 * Whether a point might lie within JUNCTION_KM of a line with this extent: a cheap
 * test before the exact one (a degree of latitude is 111 km; longitude is not tested
 * near the poles).
 * @param {{ w: number, s: number, e: number, n: number }} b @param {number[]} p
 */
function nearBox(b, p) {
  const m = JUNCTION_KM / 100;
  if (p[1] < b.s - m || p[1] > b.n + m) return false;
  if (Math.abs(p[1]) > 80) return true;
  const ml = m / Math.cos(p[1] * RAD);
  return p[0] >= b.w - ml && p[0] <= b.e + ml;
}

/** @param {string} a @param {string} b */
const strCmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Every landing point a stretch of cable reaches through junctions alone, as pairs:
 * the method this build used before chaining, kept only to count, for comparison.
 * @param {[string, string][]} edges @param {string} cid @param {Map<string, Set<string>>} pairs
 */
function reachablePairs(edges, cid, pairs) {
  /** @type {Map<string, Set<string>>} */
  const adj = new Map();
  for (const [a, b] of edges) {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)?.add(b);
    adj.get(b)?.add(a);
  }
  for (const s of [...adj.keys()].filter((k) => k[0] === 'L')) {
    const sid = Number(s.slice(1));
    const seen = new Set([s]);
    const stack = [s];
    while (stack.length) {
      for (const m of adj.get(/** @type {string} */ (stack.pop())) ?? []) {
        if (seen.has(m)) continue;
        seen.add(m);
        if (m[0] === 'B') stack.push(m);
        else if (Number(m.slice(1)) > sid) {
          const pk = `${sid},${m.slice(1)}`;
          if (!pairs.has(pk)) pairs.set(pk, new Set());
          pairs.get(pk)?.add(cid);
        }
      }
    }
  }
}

/**
 * @typedef {{ cid: string, name: string, edges: [string, string][], junctions: Map<string, number[]> }} CableGraph
 *   edges join stop keys: "L<landing point id>" or a junction key "B<lon>,<lat>"
 */

/**
 * @param {ReturnType<typeof loadLandingPoints>['lps']} lps
 * @param {ReturnType<typeof loadCables>} data
 */
function cableGraphs(lps, { cables, lines }) {
  /** @type {CableGraph[]} */
  const graphs = [];
  /** @type {Map<string, Set<string>>} */
  const reach = new Map();
  const stats = {
    cables: cables.size, planned: /** @type {string[]} */ ([]), plannedLate2021: /** @type {string[]} */ ([]),
    noYear: /** @type {string[]} */ ([]),
    noGeometry: 0, noLinks: /** @type {string[]} */ ([]), used: 0, tbdLandings: 0, segments: 0,
    snappedEnds: 0, looseEnds: 0, joinedEnds: 0, reachedEnds: 0, danglingEnds: 0, vertexJunctions: 0, throughLandings: 0,
    unplacedLandings: 0, junctions: 0, junctionsMerged: 0, fragmentsDropped: 0, inPieces: /** @type {string[]} */ ([])
  };
  for (const [cid, c] of [...cables].sort((x, y) => strCmp(x[0], y[0]))) {
    const when = serviceDate(c.rfs);
    if (plannedAtSnapshot(when)) {
      stats.planned.push(cid);
      if (when?.year === SNAPSHOT_MONTH.year) stats.plannedLate2021.push(`${cid} (${c.rfs})`);
      continue;
    }
    if (when === null) stats.noYear.push(cid);
    const segs = (lines.get(cid) ?? []).filter((ln) => ln.length >= 2);
    if (!segs.length) {
      stats.noGeometry++;
      continue;
    }
    /** @type {number[]} */
    const own = [];
    for (const l of c.landing_points) {
      if (l.is_tbd === true || l.is_tbd === 'true') {
        stats.tbdLandings++;
        continue;
      }
      if (lps.has(l.landing_point_id) && !own.includes(l.landing_point_id)) own.push(l.landing_point_id);
    }
    /** @param {number[]} p */
    const snap = (p) => {
      /** @type {number | null} */
      let best = null;
      let bd = Infinity;
      for (const id of own) {
        const lp = /** @type {{ lon: number, lat: number }} */ (lps.get(id));
        const d = km(p[0], p[1], lp.lon, lp.lat);
        if (d <= SNAP_KM && (d < bd || (d === bd && best !== null && id < best))) {
          best = id;
          bd = d;
        }
      }
      return best;
    };
    /** @type {{ s: number, key: string }[][]} stops along each segment */
    const stops = segs.map(() => []);
    /** @type {Map<string, number[]>} junction key → where it is */
    const at = new Map();
    const landed = new Set();
    segs.forEach((ln, i) => {
      stats.segments++;
      for (const [end, s] of /** @type {[number[], number][]} */ ([[ln[0], 0], [ln[ln.length - 1], ln.length - 1]])) {
        const id = snap(end);
        if (id !== null) {
          stats.snappedEnds++;
          landed.add(id);
          stops[i].push({ s, key: `L${id}` });
          continue;
        }
        stats.looseEnds++;
        const key = buKey(end);
        if (!at.has(key)) at.set(key, end);
        stops[i].push({ s, key });
        let best = { j: -1, km: REACH_KM, s: 0 };
        segs.forEach((other, j) => {
          if (j === i) return;
          const near = nearestOnLine(end, other);
          if (near.km <= best.km && (best.j === -1 || near.km < best.km)) best = { j, km: near.km, s: near.s };
        });
        if (best.j === -1) stats.danglingEnds++;
        else {
          if (best.km <= JUNCTION_KM) stats.joinedEnds++;
          else stats.reachedEnds++;
          stops[best.j].push({ s: best.s, key });
        }
      }
    });
    // A vertex drawn on another line of the cable is a junction on both (a branch drawn
    // landing to landing through its branching unit on the trunk).
    const boxes = segs.map(bbox);
    segs.forEach((ln, i) => {
      for (let k = 1; k < ln.length - 1; k++) {
        const v = ln[k];
        let best = { j: -1, km: JUNCTION_KM, s: 0 };
        segs.forEach((other, j) => {
          if (j === i || !nearBox(boxes[j], v)) return;
          const near = nearestOnLine(v, other);
          if (near.km <= best.km && (best.j === -1 || near.km < best.km)) best = { j, km: near.km, s: near.s };
        });
        if (best.j === -1) continue;
        stats.vertexJunctions++;
        const key = buKey(v);
        if (!at.has(key)) at.set(key, v);
        stops[i].push({ s: k, key });
        stops[best.j].push({ s: best.s, key });
      }
    });
    for (const id of own) {
      if (landed.has(id)) continue;
      const lp = /** @type {{ lon: number, lat: number }} */ (lps.get(id));
      let best = { j: -1, km: SNAP_KM, s: 0 };
      segs.forEach((ln, j) => {
        const near = nearestOnLine([lp.lon, lp.lat], ln);
        if (near.km <= best.km && (best.j === -1 || near.km < best.km)) best = { j, km: near.km, s: near.s };
      });
      if (best.j === -1) stats.unplacedLandings++;
      else {
        stats.throughLandings++;
        stops[best.j].push({ s: best.s, key: `L${id}` });
      }
    }
    // Each stop to the next, in route order along each line.
    /** @type {[string, string][]} */
    const raw = [];
    for (const st of stops) {
      st.sort((p, q) => p.s - q.s || strCmp(p.key, q.key));
      for (let k = 1; k < st.length; k++) if (st[k - 1].key !== st[k].key) raw.push([st[k - 1].key, st[k].key]);
    }
    reachablePairs(raw, cid, reach);

    // Junctions of this cable within MERGE_KM of each other merge (greedy, in key order;
    // the first keeps its place).
    /** @type {Map<string, string>} */
    const rep = new Map();
    /** @type {string[]} */
    const reps = [];
    for (const key of [...at.keys()].sort(strCmp)) {
      const p = /** @type {number[]} */ (at.get(key));
      let best = '';
      let bd = MERGE_KM;
      for (const r of reps) {
        const q = /** @type {number[]} */ (at.get(r));
        const d = km(p[0], p[1], q[0], q[1]);
        if (d <= bd && (best === '' || d < bd)) {
          best = r;
          bd = d;
        }
      }
      if (best) {
        rep.set(key, best);
        stats.junctionsMerged++;
      } else {
        rep.set(key, key);
        reps.push(key);
      }
    }
    /** @param {string} k */
    const r = (k) => (k[0] === 'B' ? /** @type {string} */ (rep.get(k)) : k);
    /** @type {Map<string, [string, string]>} */
    const unique = new Map();
    for (const [a, b] of raw) {
      const [x, y] = [r(a), r(b)].sort(strCmp);
      if (x !== y) unique.set(`${x} ${y}`, [x, y]);
    }
    // Drop fragments that no landing point reaches.
    /** @type {Map<string, Set<string>>} */
    const adj = new Map();
    for (const [a, b] of unique.values()) {
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a)?.add(b);
      adj.get(b)?.add(a);
    }
    const reached = new Set([...adj.keys()].filter((k) => k[0] === 'L'));
    const queue = [...reached];
    while (queue.length) for (const m of adj.get(/** @type {string} */ (queue.pop())) ?? []) if (!reached.has(m)) reached.add(m), queue.push(m);
    const edges = [...unique.values()].filter(([a]) => reached.has(a)).sort((p, q) => strCmp(p[0], q[0]) || strCmp(p[1], q[1]));
    const seenFrag = new Set();
    for (const k of adj.keys()) {
      if (reached.has(k) || seenFrag.has(k)) continue;
      stats.fragmentsDropped++;
      const q = [k];
      seenFrag.add(k);
      while (q.length) for (const m of adj.get(/** @type {string} */ (q.pop())) ?? []) if (!seenFrag.has(m)) seenFrag.add(m), q.push(m);
    }
    // A cable still in more than one piece is a sign of a junction the map hides.
    /** @type {Map<string, string>} */
    const piece = new Map();
    /** @param {string} x @returns {string} */
    const top = (x) => {
      const up = piece.get(x) ?? x;
      if (up === x) return x;
      const r = top(up);
      piece.set(x, r);
      return r;
    };
    for (const [a, b] of edges) piece.set(top(a), top(b));
    if (new Set(edges.flat().map(top)).size > 1) stats.inPieces.push(cid);
    /** @type {Map<string, number[]>} */
    const junctions = new Map();
    for (const [a, b] of edges) for (const k of [a, b]) if (k[0] === 'B') junctions.set(k, /** @type {number[]} */ (at.get(k)));
    stats.junctions += junctions.size;
    if (edges.length) {
      stats.used++;
      graphs.push({ cid, name: String(c.name ?? cid), edges, junctions });
    } else stats.noLinks.push(cid);
  }
  return { graphs, reach, stats };
}

// ---------------------------------------------------------------------------------
// The Topology Zoo: a small GML reader and a hand-rolled ustar reader.

/** Entries of a .tar.gz as name → Buffer. @param {Buffer} gz */
function untar(gz) {
  const buf = zlib.gunzipSync(gz);
  /** @type {Map<string, Buffer>} */
  const out = new Map();
  let off = 0;
  let longName = null;
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const str = (/** @type {number} */ s, /** @type {number} */ e) => h.subarray(s, e).toString('utf8').replace(/\0.*$/s, '');
    const size = parseInt(str(124, 136).trim() || '0', 8);
    const type = String.fromCharCode(h[156] || 48);
    const prefix = str(257, 263).startsWith('ustar') ? str(345, 500) : '';
    let name = longName ?? (prefix ? `${prefix}/${str(0, 100)}` : str(0, 100));
    longName = null;
    const body = buf.subarray(off + 512, off + 512 + size);
    if (type === 'L') longName = body.toString('utf8').replace(/\0.*$/s, '');
    else if (type === 'x') {
      const m = /\d+ path=([^\n]*)\n/.exec(body.toString('utf8'));
      if (m) longName = m[1];
    } else if (type === '0' || type === '\0') out.set(name, Buffer.from(body));
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}

/**
 * GML as nested lists of [key, value] pairs; a value is a number, a string, or a
 * nested list for a [ … ] block.
 * @param {string} text
 * @returns {[string, any][]}
 */
function parseGml(text) {
  const re = /\s*(?:(\[)|(\])|"([^"]*)"|([^\s[\]"]+))/gy;
  /** @type {[string, any][][]} */
  const stack = [[]];
  /** @type {string | null} */
  let pendingKey = null;
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) && m[0].length) {
    const top = stack[stack.length - 1];
    if (m[1]) {
      /** @type {[string, any][]} */
      const block = [];
      top.push([pendingKey ?? '', block]);
      stack.push(block);
      pendingKey = null;
    } else if (m[2]) {
      stack.pop();
      if (!stack.length) throw new Error('unbalanced ] in GML');
    } else if (pendingKey === null) {
      pendingKey = m[3] ?? m[4];
    } else {
      const v = m[3] !== undefined ? m[3] : Number.isNaN(Number(m[4])) ? m[4] : Number(m[4]);
      top.push([pendingKey, v]);
      pendingKey = null;
    }
  }
  return stack[0];
}

/** @param {[string, any][]} block @param {string} k */
const get = (block, k) => block.find((e) => e[0] === k)?.[1];

/** @param {string} dir */
function loadZoo(dir) {
  const files = untar(fs.readFileSync(path.join(dir, 'topozoo/gml.tar.gz')));
  /** @type {Map<string, Buffer>} */
  const byNet = new Map();
  for (const [name, body] of files) {
    const m = /(?:^|\/)([^/]+)\.gml$/.exec(name);
    if (m) byNet.set(m[1], body);
  }
  /** @type {{ net: string, id: number, label: string, lon: number, lat: number }[]} */
  const nodes = [];
  /** @type {{ a: number, b: number }[]} indexes into nodes */
  const edges = [];
  /** @type {{ name: string, label: string, date: string, nodes: number, edges: number, keptNodes: number, keptEdges: number }[]} */
  const used = [];
  const skipped = [];
  /** @type {{ km: number, net: string, between: string[] }[]} */
  const long = [];
  for (const net of ZOO_NETWORKS) {
    const body = byNet.get(net);
    if (!body) {
      skipped.push(net);
      continue;
    }
    const graph = get(parseGml(body.toString('utf8')), 'graph');
    if (!Array.isArray(graph)) throw new Error(`${net}.gml has no graph block`);
    /** @type {Map<number, { id: number, label: string, lon: number, lat: number }>} */
    const ok = new Map();
    let nodeCount = 0;
    let edgeCount = 0;
    let longEdges = 0;
    /** @type {[number, number][]} */
    const kept = [];
    for (const [k, v] of graph) {
      if (k === 'node' && Array.isArray(v)) {
        nodeCount++;
        const id = get(v, 'id');
        const lat = get(v, 'Latitude');
        const lon = get(v, 'Longitude');
        const internal = get(v, 'Internal');
        if (typeof lat !== 'number' || typeof lon !== 'number' || lat === 0) continue;
        if (internal !== undefined && Number(internal) === 0) continue;
        ok.set(id, { id, label: String(get(v, 'label') ?? ''), lon, lat });
      } else if (k === 'edge' && Array.isArray(v)) {
        edgeCount++;
        const s = get(v, 'source');
        const t = get(v, 'target');
        if (!ok.has(s) || !ok.has(t) || s === t) continue;
        const p = /** @type {{ lon: number, lat: number, label: string }} */ (ok.get(s));
        const q = /** @type {{ lon: number, lat: number, label: string }} */ (ok.get(t));
        const d = km(p.lon, p.lat, q.lon, q.lat);
        if (d > ZOO_MAX_KM) {
          longEdges++;
          long.push({ km: Math.round(d), net, between: [p.label, q.label] });
        } else kept.push([s, t]);
      }
    }
    // Only the nodes an edge uses join the hubs, in file order.
    const usedIds = new Set(kept.flat());
    /** @type {Map<number, number>} */
    const index = new Map();
    for (const [id, n] of ok) {
      if (!usedIds.has(id)) continue;
      index.set(id, nodes.length);
      nodes.push({ net, ...n });
    }
    for (const [s, t] of kept) edges.push({ a: /** @type {number} */ (index.get(s)), b: /** @type {number} */ (index.get(t)) });
    used.push({
      name: net, label: String(get(graph, 'Network') ?? get(graph, 'label') ?? net),
      date: String(get(graph, 'NetworkDate') ?? get(graph, 'DateYear') ?? ''),
      nodes: nodeCount, edges: edgeCount, keptNodes: index.size, keptEdges: kept.length, droppedOver3000Km: longEdges
    });
  }
  long.sort((x, y) => y.km - x.km || strCmp(x.net, y.net) || strCmp(x.between.join(), y.between.join()));
  return { nodes, edges, used, skipped, long };
}

// ---------------------------------------------------------------------------------
// Hubs: Vercel's regions first, then landing points by how connected they are,
// then backbone PoPs. Greedy, one pass, founders keep their own coordinates.
// Junctions come last: one within R_KM of a hub joins it, the rest stay junctions.

/** @typedef {{ lon: number, lat: number, name: string, kind: 'vercel' | 'landing' | 'zoo', members: string[] }} Hub */

function makeHubs() {
  /** @type {Hub[]} */
  const hubs = NODES.map((n) => ({ lon: n.lon, lat: n.lat, name: `${n.city} (${n.code})`, kind: 'vercel', members: [] }));
  /** The nearest hub within R_KM, or -1. @param {number} lon @param {number} lat */
  const nearest = (lon, lat) => {
    let best = -1;
    let bd = R_KM;
    for (let i = 0; i < hubs.length; i++) {
      const h = hubs[i];
      if (Math.abs(h.lat - lat) > 1) continue; // 100 km is under a degree of latitude
      const d = km(lon, lat, h.lon, h.lat);
      if (d < bd || (d === bd && best === -1)) {
        best = i;
        bd = d;
      }
    }
    return best;
  };
  /** @param {number} lon @param {number} lat @param {string} name @param {Hub['kind']} kind */
  const place = (lon, lat, name, kind) => {
    let best = nearest(lon, lat);
    if (best === -1) {
      hubs.push({ lon, lat, name, kind, members: [] });
      best = hubs.length - 1;
    }
    hubs[best].members.push(name);
    return best;
  };
  return { hubs, nearest, place };
}

// ---------------------------------------------------------------------------------
// Output

const JBASE = 1_000_000; // junction ids, before renumbering, start here

/** @param {number} cables @param {boolean} terr @param {boolean} tether */
const code = (cables, terr, tether) => (Math.min(cables, 15) << 2) | (terr ? 2 : 0) | (tether ? 1 : 0);

/** @typedef {{ a: number, b: number, cables: Set<string>, terr: boolean, tether: boolean }} Link */

function main() {
  const dir = rawDir();
  console.log(`reading ${path.relative(ROOT, dir)}`);
  const sources = readJson(dir, 'sources.json');

  // (1)–(2) landing points, cables, and each cable's chain of stops
  const { lps, features: lpFeatures, variants } = loadLandingPoints(dir);
  const cableData = loadCables(dir);
  const { graphs, reach, stats: cableStats } = cableGraphs(lps, cableData);

  // (3) the Zoo, without its adjacencies over ZOO_MAX_KM
  const zoo = loadZoo(dir);

  // (4) cluster: landing points by how many stops they link to, then Zoo nodes
  /** @type {Map<number, Set<string>>} */
  const neighbours = new Map();
  /** @param {string} cid @param {string} k */
  const global = (cid, k) => (k[0] === 'L' ? k : `${cid} ${k}`);
  for (const g of graphs)
    for (const [a, b] of g.edges)
      for (const [x, y] of [[a, b], [b, a]])
        if (x[0] === 'L') {
          const id = Number(x.slice(1));
          if (!neighbours.has(id)) neighbours.set(id, new Set());
          neighbours.get(id)?.add(global(g.cid, y));
        }
  const lpOrder = [...neighbours.keys()].sort((a, b) => (neighbours.get(b)?.size ?? 0) - (neighbours.get(a)?.size ?? 0) || a - b);
  const { hubs, nearest, place } = makeHubs();
  /** @type {Map<string, number>} stop (global key) → node id: a hub index, or JBASE + junction index */
  const nodeOf = new Map();
  for (const id of lpOrder) {
    const lp = /** @type {{ lon: number, lat: number, name: string }} */ (lps.get(id));
    nodeOf.set(`L${id}`, place(lp.lon, lp.lat, lp.name, 'landing'));
  }
  const zooHub = zoo.nodes.map((n) => place(n.lon, n.lat, `${n.label} (${n.net})`, 'zoo'));
  /** @type {{ lon: number, lat: number, name: string }[]} */
  const junctions = [];
  let junctionsJoinedHubs = 0;
  for (const g of graphs) {
    for (const [k, p] of [...g.junctions].sort((x, y) => strCmp(x[0], y[0]))) {
      const h = nearest(p[0], p[1]);
      if (h >= 0) {
        junctionsJoinedHubs++;
        hubs[h].members.push(`junction of ${g.name}`);
        nodeOf.set(global(g.cid, k), h);
      } else {
        nodeOf.set(global(g.cid, k), JBASE + junctions.length);
        junctions.push({ lon: p[0], lat: p[1], name: `junction of ${g.name}` });
      }
    }
  }

  // (5) links between nodes
  /** @type {Map<string, Link>} */
  const links = new Map();
  /** @param {number} x @param {number} y */
  const keyOf = (x, y) => (x < y ? `${x},${y}` : `${y},${x}`);
  /** @param {number} x @param {number} y */
  const linkAt = (x, y) => {
    const k = keyOf(x, y);
    let l = links.get(k);
    if (!l) links.set(k, (l = { a: Math.min(x, y), b: Math.max(x, y), cables: new Set(), terr: false, tether: false }));
    return l;
  };
  for (const g of graphs) {
    for (const [a, b] of g.edges) {
      const x = /** @type {number} */ (nodeOf.get(global(g.cid, a)));
      const y = /** @type {number} */ (nodeOf.get(global(g.cid, b)));
      if (x !== y) linkAt(x, y).cables.add(g.cid);
    }
  }
  // The 3,000 km rule again, between the hubs the Zoo nodes joined, which can sit up to
  // R_KM from them.
  const zooFarAfterClustering = new Set();
  let zooEdgesFarAfterClustering = 0;
  for (const e of zoo.edges) {
    const x = zooHub[e.a];
    const y = zooHub[e.b];
    if (x === y) continue;
    if (km(hubs[x].lon, hubs[x].lat, hubs[y].lon, hubs[y].lat) > ZOO_MAX_KM) {
      zooEdgesFarAfterClustering++;
      zooFarAfterClustering.add(keyOf(x, y));
      continue;
    }
    linkAt(x, y).terr = true;
  }
  // The old method, for comparison: every landing point a stretch of cable reaches.
  const reachableLinks = new Set();
  for (const k of reach.keys()) {
    const [a, b] = k.split(',');
    const x = nodeOf.get(`L${a}`);
    const y = nodeOf.get(`L${b}`);
    if (x !== undefined && y !== undefined && x !== y) reachableLinks.add(keyOf(x, y));
  }

  // A junction is a stop only where a cable branches: dead ends go, and a junction
  // with two neighbours becomes one link between them; then any piece with no hub goes.
  /** @type {Map<number, Set<number>>} */
  const adj = new Map();
  /** @param {number} x @param {number} y */
  const join = (x, y) => {
    if (!adj.has(x)) adj.set(x, new Set());
    if (!adj.has(y)) adj.set(y, new Set());
    adj.get(x)?.add(y);
    adj.get(y)?.add(x);
  };
  for (const l of links.values()) join(l.a, l.b);
  let deadEnds = 0;
  let passThroughs = 0;
  /** @type {{ landing: string, junction: string, at: number[], hubLeftUnlinked: boolean }[]} */
  const lostBranches = [];
  for (let changed = true; changed; ) {
    changed = false;
    for (const x of [...adj.keys()].filter((id) => id >= JBASE).sort((p, q) => p - q)) {
      const nb = adj.get(x);
      if (!nb) continue;
      if (nb.size <= 1) {
        for (const y of nb) {
          links.delete(keyOf(x, y));
          adj.get(y)?.delete(x);
          if (y < JBASE) {
            const j = junctions[x - JBASE];
            lostBranches.push({ landing: hubs[y].name, junction: j.name, at: [j.lon, j.lat], hubLeftUnlinked: (adj.get(y)?.size ?? 0) === 0 });
          }
        }
        adj.delete(x);
        deadEnds++;
        changed = true;
      } else if (nb.size === 2) {
        const [p, q] = [...nb];
        const l1 = /** @type {Link} */ (links.get(keyOf(x, p)));
        const l2 = /** @type {Link} */ (links.get(keyOf(x, q)));
        links.delete(keyOf(x, p));
        links.delete(keyOf(x, q));
        adj.get(p)?.delete(x);
        adj.get(q)?.delete(x);
        adj.delete(x);
        const l = linkAt(p, q);
        for (const c of [...l1.cables, ...l2.cables]) l.cables.add(c);
        join(p, q);
        passThroughs++;
        changed = true;
      }
    }
  }
  const reached = new Set([...adj.keys()].filter((id) => id < JBASE));
  const queue = [...reached];
  while (queue.length) for (const m of adj.get(/** @type {number} */ (queue.pop())) ?? []) if (!reached.has(m)) reached.add(m), queue.push(m);
  let strandedJunctions = 0;
  for (const x of adj.keys()) if (!reached.has(x)) strandedJunctions++;
  for (const [k, l] of links) if (!reached.has(l.a) || !reached.has(l.b)) links.delete(k);

  // (6) a Vercel region nothing reaches is tied, schematically, to its two nearest linked hubs
  const degreeOf = (/** @type {number} */ i) => adj.get(i)?.size ?? 0;
  const linked = hubs.map((_, i) => i).filter((i) => degreeOf(i) > 0);
  const tethered = [];
  for (let v = 0; v < NODES.length; v++) {
    if (degreeOf(v) > 0) continue;
    const near = linked
      .filter((i) => i !== v)
      .map((i) => ({ i, d: km(hubs[v].lon, hubs[v].lat, hubs[i].lon, hubs[i].lat) }))
      .sort((p, q) => p.d - q.d || p.i - q.i)
      .slice(0, 2);
    for (const { i } of near) linkAt(v, i).tether = true;
    tethered.push({ code: NODES[v].code, to: near.map(({ i }) => hubs[i].name) });
  }

  // (7)–(8) keep what is linked; Vercel stays 0..18, other hubs follow in order of first
  // appearance, and the junctions come after every hub.
  const ordered = [...links.values()].sort((p, q) => p.a - q.a || p.b - q.b);
  /** @type {Map<number, number>} */
  const renumber = new Map(NODES.map((_, i) => [i, i]));
  for (const l of ordered) for (const x of [l.a, l.b]) if (x < JBASE && !renumber.has(x)) renumber.set(x, renumber.size);
  const h = renumber.size;
  for (const l of ordered) for (const x of [l.a, l.b]) if (!renumber.has(x)) renumber.set(x, renumber.size);
  const keep = [...renumber.entries()].sort((p, q) => p[1] - q[1]).map(([old]) => old);
  /** @param {number} id */
  const where = (id) => (id < JBASE ? hubs[id] : junctions[id - JBASE]);
  const outLinks = ordered
    .map((l) => {
      const a = /** @type {number} */ (renumber.get(l.a));
      const b = /** @type {number} */ (renumber.get(l.b));
      return { ...l, a: Math.min(a, b), b: Math.max(a, b) };
    })
    .sort((p, q) => p.a - q.a || p.b - q.b);

  const n = keep.flatMap((id) => [Math.round(where(id).lon * 10) + 0, Math.round(where(id).lat * 10) + 0]);
  const l = outLinks.flatMap((x) => [x.a, x.b, code(x.cables.size, x.terr, x.tether)]);
  const net = { v: 1, license: LICENSE, credits: '/credits', h, n, l };
  const json = JSON.stringify(net);

  // (10) the checks the renderer relies on
  const count = n.length / 2;
  const fail = (/** @type {string} */ m) => {
    throw new Error(`net.json check failed: ${m}`);
  };
  if (Buffer.byteLength(json) >= MAX_BYTES) fail(`${Buffer.byteLength(json)} bytes, limit ${MAX_BYTES}`);
  if (!(h >= NODES.length && h <= count)) fail(`h = ${h} with ${count} nodes`);
  const deg = new Array(count).fill(0);
  for (let i = 0; i < l.length; i += 3) {
    const [a, b, t] = [l[i], l[i + 1], l[i + 2]];
    if (!(a >= 0 && a < count && b >= 0 && b < count)) fail(`link ${i / 3} index out of range`);
    if (a === b) fail(`link ${i / 3} is a self-loop`);
    if ((a >= h || b >= h) && t >> 2 < 1) fail(`link ${i / 3} reaches a junction without a cable`);
    deg[a]++;
    deg[b]++;
  }
  NODES.forEach((node, i) => {
    if (keep[i] !== i || hubs[i].kind !== 'vercel') fail(`hub ${i} is not ${node.code}`);
    if (deg[i] < 1) fail(`${node.code} has no link`);
    if (Math.abs(n[2 * i] / 10 - node.lon) > 0.15 || Math.abs(n[2 * i + 1] / 10 - node.lat) > 0.15)
      fail(`${node.code} moved more than 0.15°`);
  });
  const vercelSpots = new Set(NODES.map((_, i) => `${n[2 * i]},${n[2 * i + 1]}`));
  if (vercelSpots.size !== NODES.length) fail('two Vercel regions share a hub');
  if (deg.some((d) => d === 0)) fail('a node with no link survived');
  if (deg.some((d, i) => i >= h && d < 3)) fail('a junction where no cable branches survived');
  if (lostBranches.length > MAX_LOST_BRANCHES)
    fail(`${lostBranches.length} branches to a landing point were lost as dead ends (at most ${MAX_LOST_BRANCHES}): ${JSON.stringify(lostBranches)}`);

  writeOutputs({
    dir, sources, json, net, hubs, junctions, keep, where, h, outLinks, deg, lps, lpFeatures, variants, cableData,
    cableStats, reach, reachableLinks: reachableLinks.size, zoo, tethered,
    junctionStats: { joinedHubs: junctionsJoinedHubs, deadEnds, passThroughs, stranded: strandedJunctions, lostBranches },
    zooFar: { edges: zooEdgesFarAfterClustering, hubPairs: zooFarAfterClustering.size }
  });
}

/**
 * net.json is the contract with the renderer:
 *   n: node i sits at lon n[2i]/10, lat n[2i+1]/10 (whole tenths of a degree);
 *      nodes 0..18 are Vercel's regions in the order of NODES; nodes 0..h-1 are hubs,
 *      nodes h.. are junctions where a cable branches at sea (no dot is drawn there).
 *   l: triples [a, b, t], a < b, with t = (min(cables, 15) << 2) | (terrestrial << 1) | tether.
 *      A submarine link has cables ≥ 1 (every link that touches a junction is one);
 *      a backbone-only link has cables 0 and the terrestrial bit; a tether (cables 0,
 *      terrestrial 0, tether 1) is a schematic dotted line to a Vercel region nothing
 *      else reaches.
 * @param {any} o
 */
function writeOutputs(o) {
  const { dir, sources, json, net, hubs, keep, where, h, outLinks, deg, lps, lpFeatures, variants, cableData, cableStats, reach, reachableLinks, zoo, tethered, junctionStats, zooFar } = o;
  fs.writeFileSync(path.join(NET, 'net.json'), json);

  const kinds = { submarine: 0, submarineAndBackbone: 0, backbone: 0, tether: 0, touchingAJunction: 0, cablesClampedAt15: 0 };
  let longest = { km: 0, between: ['', ''] };
  for (const x of outLinks) {
    if (x.tether) kinds.tether++;
    else if (x.cables.size && x.terr) kinds.submarineAndBackbone++;
    else if (x.cables.size) kinds.submarine++;
    else kinds.backbone++;
    if (x.a >= h || x.b >= h) kinds.touchingAJunction++;
    if (x.cables.size > 15) kinds.cablesClampedAt15++;
    const [p, q] = [where(keep[x.a]), where(keep[x.b])];
    const d = km(p.lon, p.lat, q.lon, q.lat);
    if (d > longest.km) longest = { km: Math.round(d), between: [p.name, q.name] };
  }
  const founders = { vercel: 0, landing: 0, zoo: 0 };
  for (const id of keep.slice(0, h)) founders[/** @type {'vercel' | 'landing' | 'zoo'} */ (hubs[id].kind)]++;

  /** @param {string} rel */
  const fileRecord = (rel) => {
    const r = sources.files.find((/** @type {any} */ f) => f.path === rel);
    if (!r) throw new Error(`sources.json does not list ${rel}`);
    const body = fs.readFileSync(path.join(dir, rel));
    if (sha256(body) !== r.sha256) throw new Error(`${rel} changed since it was fetched`);
    return { url: r.url, sha256: r.sha256, bytes: r.bytes };
  };
  const cableFiles = sources.files.filter((/** @type {any} */ f) => /^telegeography\/api\/v2\/cable\/(?!all\.json|cable-geo\.json)[^/]+\.json$/.test(f.path));
  const manifest = cableFiles.map((/** @type {any} */ f) => `${f.path} ${f.sha256}\n`).join('');
  const linkedLps = new Set();
  for (const k of keep.slice(0, h)) for (const m of hubs[k].members) linkedLps.add(m);
  const buf = Buffer.from(json);
  const zooKept = zoo.used.reduce((s, /** @type {any} */ x) => s + x.keptEdges, 0);

  const meta = {
    about: 'How src/lib/net/net.json was built (scripts/net/build.mjs). Regenerated by the build; do not edit.',
    shape: {
      h: 'nodes 0..h-1 are hubs; nodes h.. are junctions where a cable branches at sea (no dot)',
      n: 'node i at lon n[2i]/10, lat n[2i+1]/10; nodes 0..18 are the Vercel regions of src/lib/net/nodes.js in order',
      l: 'triples [a, b, t], a < b; t = (min(cables,15) << 2) | (terrestrial << 1) | tether; links touching a junction have cables >= 1'
    },
    snapshot: {
      telegeography: SNAPSHOT_DATE,
      telegeographyCreationTime: sources.telegeography.creationTime,
      telegeographyCommit: sources.telegeography.commit,
      topologyZoo: { doi: sources.topozoo.doi, published: sources.topozoo.published, citation: sources.topozoo.citation },
      fetched: sources.finished
    },
    sources: {
      'telegeography/README.md': fileRecord('telegeography/README.md'),
      'telegeography/api/v2/cable/cable-geo.json': fileRecord('telegeography/api/v2/cable/cable-geo.json'),
      'telegeography/api/v2/landing-point/landing-point-geo.json': fileRecord('telegeography/api/v2/landing-point/landing-point-geo.json'),
      'telegeography/api/v2/cable/<id>.json': {
        url: `https://raw.githubusercontent.com/stealthscooty/www.submarinecablemap.com/${sources.telegeography.commit}/public/api/v2/cable/<id>.json`,
        files: cableFiles.length,
        manifestSha256: sha256(Buffer.from(manifest)),
        manifest: 'sha256 of the lines "<path> <sha256>\\n", sorted by path, from sources.json'
      },
      'topozoo/gml.tar.gz': fileRecord('topozoo/gml.tar.gz'),
      'topozoo/article.json': fileRecord('topozoo/article.json')
    },
    licenses: {
      derived: { name: 'CC BY-NC-SA 3.0', url: LICENSE },
      telegeography: sources.telegeography.license,
      topologyZoo: sources.topozoo.license
    },
    parameters: {
      clusterRadiusKm: R_KM, snapKm: SNAP_KM, joinKm: JUNCTION_KM, reachKm: REACH_KM, junctionMergeKm: MERGE_KM, maxLostBranches: MAX_LOST_BRANCHES,
      zooMaxKm: ZOO_MAX_KM, plannedAfter: '2021-06 (a service month or quarter after June 2021, or a year after 2021)', coordinatePrecisionDeg: 0.1, maxBytes: MAX_BYTES
    },
    counts: {
      nodes: keep.length,
      hubs: h,
      hubsBySeed: founders,
      junctions: keep.length - h,
      links: outLinks.length,
      linksByKind: kinds,
      reachablePairMethodLinks: reachableLinks,
      longestLink: longest,
      maxHubDegree: Math.max(...deg.slice(0, h)),
      tethered
    },
    telegeography: {
      landingPointFeatures: lpFeatures,
      landingPoints: lps.size,
      landingPointRepeats: variants,
      landingPointsInHubs: [...lps.values()].filter((lp) => linkedLps.has(lp.name)).length,
      cableGeoFeatures: cableData.geoFeatures,
      cables: cableStats.cables,
      cablesPlannedAtSnapshotDropped: cableStats.planned.length,
      cablesPlannedLater2021Dropped: cableStats.plannedLate2021,
      cablesWithNoServiceYearKept: cableStats.noYear,
      cablesWithoutGeometry: cableStats.noGeometry,
      cablesYieldingLinks: cableStats.used,
      cablesYieldingNoLinks: cableStats.noLinks,
      tbdLandingsDropped: cableStats.tbdLandings,
      segments: cableStats.segments,
      segmentEndsAtLandingPoints: cableStats.snappedEnds,
      looseSegmentEnds: cableStats.looseEnds,
      looseEndsJoinedWithin5Km: cableStats.joinedEnds,
      looseEndsReachedWithin15Km: cableStats.reachedEnds,
      looseEndsLeftDangling: cableStats.danglingEnds,
      vertexJunctions: cableStats.vertexJunctions,
      landingPointsOnALineInterior: cableStats.throughLandings,
      landingPointsNotOnTheirCable: cableStats.unplacedLandings,
      junctionsMergedWithin25Km: cableStats.junctionsMerged,
      fragmentsNoLandingPointReaches: cableStats.fragmentsDropped,
      cablesDrawnInMoreThanOnePiece: cableStats.inPieces,
      junctionsAfterMerging: cableStats.junctions,
      junctionsJoinedToAHub: junctionStats.joinedHubs,
      junctionDeadEndsRemoved: junctionStats.deadEnds,
      branchesToALandingPointLostAsDeadEnds: junctionStats.lostBranches,
      passThroughJunctionsRemoved: junctionStats.passThroughs,
      junctionsStrandedWithoutAHub: junctionStats.stranded,
      landingPointPairsReachable: reach.size,
      plannedDropped: cableStats.planned
    },
    topologyZoo: {
      networks: zoo.used,
      skipped: zoo.skipped,
      nodesClustered: zoo.nodes.length,
      edgesKept: zooKept,
      edgesOver3000KmDropped: zoo.long.length,
      edgesOver3000KmBetweenTheirHubsDropped: zooFar.edges,
      hubPairsOver3000KmDropped: zooFar.hubPairs,
      longestDropped: zoo.long.slice(0, 10)
    },
    bytes: {
      raw: buf.length,
      gzip: zlib.gzipSync(buf, { level: 9 }).length,
      brotli: zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length
    }
  };
  fs.writeFileSync(path.join(NET, 'net.meta.json'), JSON.stringify(meta, null, 2) + '\n');

  const names = keep.map((id, i) => ({
    i,
    name: where(id).name,
    seed: i < h ? hubs[id].kind : 'junction',
    lon: net.n[2 * i] / 10,
    lat: net.n[2 * i + 1] / 10,
    degree: deg[i],
    members: i < h ? hubs[id].members : []
  }));
  fs.writeFileSync(path.join(NET, 'net.names.json'), JSON.stringify(names, null, 1) + '\n');

  console.log(
    `net.json: ${h} hubs (${founders.vercel} Vercel, ${founders.landing} landing, ${founders.zoo} backbone) and ${keep.length - h} junctions; ` +
      `${outLinks.length} links (${kinds.submarine} submarine, ${kinds.submarineAndBackbone} both, ${kinds.backbone} backbone, ${kinds.tether} tether; ` +
      `${kinds.touchingAJunction} touch a junction; reachable pairs would make ${reachableLinks}); ` +
      `${meta.bytes.raw} bytes, ${meta.bytes.gzip} gzip, ${meta.bytes.brotli} brotli`
  );
}

main();
