import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NODES, nodeByCode, nearestNode, guessNode, angle } from '../../src/lib/net/nodes.js';
import { globe, netImage, projector, HUBS, LINKS, REGION_OF, COUNTS, HUB_COUNT, LICENSE, CX, CY, R } from '../../src/lib/net/globe.js';

/** the server's frames, as TheNet renders them: each region's own view, lit, and an unlit default */
const SERVER_VIEWS = [{ lat: 20, lon: 0, lit: null }, ...NODES.map((n) => ({ lat: n.lat, lon: n.lon, lit: n.code }))];
const FRAME_MIN_TERR_DEG = 1.35;
import { fnv1a, minuteKey, dayKey, pickPoem, pictureSeed } from '../../src/lib/net/pick.js';
import { readingTime, measureText, jitteredWait, aboutWait, slowWpm, DEFAULT_PACE } from '../../src/lib/net/reading.js';
import { whereFrom } from '../../src/lib/net/where.js';
import { describePicture, hueName } from '../../src/lib/net/voice.js';
import { generateTune } from '../../src/lib/bloom/generate.js';

test('the nineteen nodes have distinct codes and sane coordinates', () => {
  assert.equal(NODES.length, 19);
  assert.equal(new Set(NODES.map((n) => n.code)).size, 19);
  for (const n of NODES) {
    assert.match(n.code, /^[a-z]{3}\d$/);
    assert.ok(Math.abs(n.lat) <= 90 && Math.abs(n.lon) <= 180, n.code);
  }
  assert.equal(nodeByCode('SFO1')?.city, 'San Francisco');
  assert.equal(nodeByCode('nope'), null);
  assert.equal(nodeByCode(null), null);
});

test('the nearest node is by great circle', () => {
  assert.equal(nearestNode(37.3, -121.9).code, 'sfo1'); // San José
  assert.equal(nearestNode(48.2, 16.4).code, 'fra1'); // Vienna
  assert.equal(nearestNode(-37.8, 145).code, 'syd1'); // Melbourne
  assert.equal(nearestNode(-1.3, 36.8).code, 'cpt1'); // Nairobi: nearer Cape Town than Mumbai
  assert.ok(Math.abs(angle(0, 0, 0, 90) - Math.PI / 2) < 1e-9);
});

test('a browser with only its clock still finds a node', () => {
  assert.equal(guessNode({ timeZone: 'America/Los_Angeles' })?.code, 'sfo1');
  assert.equal(guessNode({ timeZone: 'Europe/Paris' })?.code, 'cdg1');
  assert.equal(guessNode({ timeZone: 'Mars/Olympus', offsetMinutes: 540 })?.code, 'kix1'); // UTC+9 at 30°N is nearest Osaka
  assert.equal(guessNode({ timeZone: null, offsetMinutes: null }), null);
});

test('the projection puts the view centre in the middle of the box, facing out', () => {
  const p = projector(37.77, -122.42);
  const c = p(37.77, -122.42);
  assert.ok(Math.abs(c.x - CX) < 1e-9 && Math.abs(c.y - CY) < 1e-9);
  assert.ok(c.depth > 0.999);
  assert.ok(p(-37.77, 57.58).depth < -0.999, 'the antipode faces away');
});

/** every coordinate pair of a path, absolute (the data uses M and relative l) */
function pointsOf(d) {
  const out = [];
  let x = 0;
  let y = 0;
  for (const m of d.matchAll(/([Ml])(-?\d+),(-?\d+)/g)) {
    if (m[1] === 'M') {
      x = Number(m[2]);
      y = Number(m[3]);
    } else {
      x += Number(m[2]);
      y += Number(m[3]);
    }
    out.push([x, y]);
  }
  return out;
}

test('the hub data is there, with Vercel\'s regions first and a region for every hub', () => {
  assert.ok(COUNTS.hubs >= 400 && COUNTS.links >= 400, `${COUNTS.hubs} hubs, ${COUNTS.links} links`);
  assert.equal(HUB_COUNT, COUNTS.hubs);
  assert.ok(HUB_COUNT <= HUBS.length, 'junction nodes, if any, come after the hubs');
  NODES.forEach((n, i) => {
    assert.ok(Math.abs(HUBS[i].lat - n.lat) < 0.15 && Math.abs(HUBS[i].lon - n.lon) < 0.15, `hub ${i} is ${n.code}`);
    assert.equal(REGION_OF[i], n.code);
  });
  for (const code of REGION_OF) assert.ok(NODES.some((n) => n.code === code));
  for (const l of LINKS) assert.ok(l.a !== l.b && l.a < HUBS.length && l.b < HUBS.length);
  assert.ok(LICENSE.startsWith('https://creativecommons.org/licenses/'));
});

test('the globe draws branches, hubs and the lit region, all inside the disc, cut at the limb', () => {
  const g = globe({ lat: 37.77, lon: -122.42, lit: 'sfo1' });
  const all = [g.arcs.sub1, g.arcs.sub2, g.arcs.sub3, g.arcs.terr, g.glow.full, g.glow.half];
  assert.ok(all.some((d) => d.startsWith('M')), 'some branches face the viewer');
  assert.ok(g.glow.full.length + g.glow.half.length > 0, 'the answering region has glowing branches');
  assert.ok(g.hubs.region.includes('h.01') && g.hubs.front.includes('h.01'));
  assert.deepEqual([g.litDot?.x, g.litDot?.y, g.litDot?.front], [CX, CY, true]);
  const limit = (R * 1.08) ** 2;
  for (const d of [...all, g.hubs.front, g.hubs.region, g.regions]) {
    for (const [x, y] of pointsOf(d)) assert.ok((x - CX) ** 2 + (y - CY) ** 2 <= limit, `${x},${y} is off the sphere`);
  }
  for (const [x, y] of pointsOf(g.hubs.front)) assert.ok((x - CX) ** 2 + (y - CY) ** 2 <= (R + 1) ** 2, 'hubs sit on the sphere (whole units)');
  assert.doesNotMatch(g.arcs.sub1, /\.\d/, 'whole units only');
  assert.doesNotMatch(g.arcs.sub1 + g.hubs.front, / /, 'no spaces: the path data travels in a data: URI as it is');
  const unlit = globe({ lat: 0, lon: 0 });
  assert.equal(unlit.glow.full + unlit.glow.half + unlit.hubs.region, '', 'no lit region, no glow');
  assert.equal(unlit.litDot, null);
});

test('the view decides what shows: the far side is left out and turning the Earth changes the frame', () => {
  const a = globe({ lat: 51.5, lon: -0.1, lit: 'lhr1' });
  const b = globe({ lat: -33.9, lon: 151.2, lit: 'lhr1' });
  assert.notEqual(a.arcs.sub1 + a.arcs.sub2, b.arcs.sub1 + b.arcs.sub2);
  assert.ok(b.litDot && !b.litDot.front, 'London is behind the Earth from Sydney');
  assert.ok(b.hubs.back.length > 0, 'the far side keeps its faint hubs');
  assert.ok(b.hubs.back.includes(`M${b.litDot?.x},${b.litDot?.y}h.01`), 'a lit hub on the far side keeps its faint dot too');
  const full = globe({ lat: 50.1, lon: 8.7, lit: 'fra1' });
  const slim = globe({ lat: 50.1, lon: 8.7, lit: 'fra1', minTerrDeg: FRAME_MIN_TERR_DEG });
  assert.ok(slim.arcs.terr.length < full.arcs.terr.length, 'the frame leaves short backbone hops out');
  assert.equal(slim.glow.full + slim.glow.half, full.glow.full + full.glow.half, 'but never the lit region\'s own branches');
});

test('every run of a branch ends at a hub or at the limb, and only hubs get dots', () => {
  const view = { lat: 37.77, lon: -122.42, lit: 'sfo1' };
  const g = globe(view);
  const proj = projector(view.lat, view.lon);
  const at = new Set(HUBS.map((h) => { const q = proj(h.lat, h.lon); return `${Math.round(q.x)},${Math.round(q.y)}`; }));
  let runs = 0;
  let offLimb = 0;
  for (const d of [g.arcs.sub1, g.arcs.sub2, g.arcs.sub3, g.arcs.terr, g.glow.full, g.glow.half]) {
    for (const run of d.split('M').filter(Boolean)) {
      const pts = pointsOf('M' + run);
      runs++;
      for (const end of [pts[0], pts[pts.length - 1]]) {
        if (at.has(`${end[0]},${end[1]}`)) continue; // a hub, possibly lifted by a hair
        const r = Math.hypot(end[0] - CX, end[1] - CY);
        if (Math.abs(r - R) > 3) offLimb++;
      }
    }
  }
  assert.ok(runs > 200, `${runs} runs`);
  assert.equal(offLimb, 0, 'a run that does not end at a hub ends on the limb, within 3 units');
  const dots = (d) => (d.match(/h\.01/g) || []).length;
  const drawn = dots(g.hubs.front) + dots(g.hubs.back) + dots(g.hubs.region) + dots(g.regions) + (g.litDot ? 1 : 0);
  assert.equal(drawn, HUB_COUNT, 'every hub has a dot, junctions have none');
  assert.ok(HUBS.length > HUB_COUNT, 'there are junction nodes');
});

test('the first frame is a picture: one SVG document per theme in a data: URI, safe in an attribute, within budget on every view', () => {
  const g = globe({ lat: 50.1, lon: 8.7, lit: 'fra1', minTerrDeg: FRAME_MIN_TERR_DEG });
  const light = netImage(g, 'light');
  const dark = netImage(g, 'dark');
  assert.ok(light.startsWith('data:image/svg+xml,%3Csvg%20'));
  assert.ok(light.endsWith('%3C/svg%3E'));
  for (const uri of [light, dark]) assert.doesNotMatch(uri, /[#<>" ]/, 'no raw #, <, >, quotes or spaces');
  let worst = 0;
  let where = '';
  for (const v of SERVER_VIEWS) {
    const size = netImage(globe({ ...v, minTerrDeg: FRAME_MIN_TERR_DEG }), 'dark').length;
    if (size > worst) {
      worst = size;
      where = v.lit || 'unlit';
    }
  }
  assert.ok(worst < 48000, `the busiest server frame (${where}) is ${worst} bytes`);
  assert.notEqual(light, dark);
  assert.ok(light.includes('%23533737') && dark.includes('%23e2c8ee'));
  assert.ok(!netImage(globe({ lat: 0, lon: 0 }), 'light').includes("r='26'"), 'no lit node, no halo');
  assert.ok(!decodeURIComponent(light).includes("r='440'"), 'no outline around the Earth');
});

test('picks are deterministic, spread, and keyed by node and minute', () => {
  assert.equal(fnv1a('a'), 0xe40c292c);
  const slugs = ['a', 'b', 'c', 'd', 'e'];
  assert.equal(pickPoem(slugs, 'sfo1', '2026-10-23T18:40'), pickPoem(slugs, 'sfo1', '2026-10-23T18:40'));
  const counts = {};
  for (let i = 0; i < 5000; i++) {
    const s = pickPoem(slugs, 'sfo1', `2026-10-23T18:${i}`);
    counts[s] = (counts[s] || 0) + 1;
  }
  for (const s of slugs) assert.ok(counts[s] > 700 && counts[s] < 1300, `${s}: ${counts[s]}`);
  assert.equal(pickPoem([], 'sfo1', 'x'), null);
  assert.equal(minuteKey(new Date('2026-10-23T18:40:59.999Z')), '2026-10-23T18:40');
  assert.match(dayKey(new Date(2026, 9, 3)), /^2026-10-03$/);
  assert.notEqual(pictureSeed('sfo1', '2026-10-23'), pictureSeed('sfo1', '2026-10-24'));
  assert.notEqual(pictureSeed('sfo1', '2026-10-23'), pictureSeed('lhr1', '2026-10-23'));
});

test('the reading time waits for a reader two spreads below the mean, plus a pause per line', () => {
  assert.equal(slowWpm(DEFAULT_PACE), 138);
  const text = measureText('opening in sight\nthere’s but one tale unwending\nyours and mine the merest part\nno one knows the ending\nnone can know the start');
  assert.deepEqual(text, { words: 24, lines: 5 });
  assert.equal(readingTime(text), Math.round((24 / 138) * 60000 + 5 * 500));
  assert.equal(readingTime({ words: 1, lines: 1 }), DEFAULT_PACE.floorMs, 'never shorter than the floor');
  assert.equal(readingTime({ words: 276, lines: 0 }, { ...DEFAULT_PACE, linePauseMs: 0 }), 120000);
});

test('the wait is about ninety seconds and never exactly ninety', () => {
  const seen = new Set();
  let i = 0;
  const rnd = () => ((i++ * 7919) % 1000) / 1000;
  for (let k = 0; k < 3000; k++) seen.add(jitteredWait(DEFAULT_PACE, rnd));
  assert.ok(!seen.has(90000));
  assert.ok(Math.min(...seen) >= 78000 && Math.max(...seen) <= 102000);
  assert.ok(seen.size > 50, 'it varies');
  assert.equal(jitteredWait(DEFAULT_PACE, () => 0.5), 91000, 'an offset under a second is pushed to a second');
  assert.equal(aboutWait(DEFAULT_PACE), 'about 90 seconds');
  assert.equal(aboutWait({ ...DEFAULT_PACE, waitMs: 30000 }), 'about 30 seconds');
  assert.equal(aboutWait({ ...DEFAULT_PACE, waitMs: 180000 }), 'about 3 minutes');
});

test('the answering node comes from the query, then x-vercel-id, then the geolocation headers', () => {
  const url = (q = '') => new URL(`https://allisinbloom.art/${q}`);
  assert.deepEqual(whereFrom(new Headers({ 'x-vercel-id': 'sfo1::iad1::abc-1' }), url()), { code: 'sfo1', source: 'network' });
  assert.deepEqual(whereFrom(new Headers({ 'x-vercel-id': 'sfo1::iad1::abc-1' }), url('?node=HND1')), { code: 'hnd1', source: 'query' });
  assert.deepEqual(whereFrom(new Headers({ 'x-vercel-id': 'zzz9::abc' }), url('?node=mars')), { code: null, source: 'none' });
  assert.deepEqual(whereFrom(new Headers({ 'x-vercel-ip-latitude': '48.86', 'x-vercel-ip-longitude': '2.35' }), url()), { code: 'cdg1', source: 'geo' });
  assert.deepEqual(whereFrom(new Headers(), url()), { code: null, source: 'none' });
});

test('the narration is deterministic, names the place and the day, and reads as prose', () => {
  const tune = { ...generateTune(pictureSeed('sfo1', '2026-10-23')), seed: pictureSeed('sfo1', '2026-10-23') };
  const a = describePicture(tune, nodeByCode('sfo1'), '2026-10-23', false);
  assert.equal(a, describePicture(tune, nodeByCode('sfo1'), '2026-10-23', false));
  assert.match(a, /^San Francisco, USA, 23 October 2026\. /);
  assert.ok(a.split('. ').length >= 4);
  assert.match(describePicture(tune, null, '2026-10-23', true), /^an undisclosed location, /);
  assert.equal(hueName('#ffffff'), 'pearl');
  assert.equal(hueName('#8800aa'), 'plum');
  assert.equal(hueName('#d3b3e0'), 'lilac');
});
