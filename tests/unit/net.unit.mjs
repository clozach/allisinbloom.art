import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NODES, nodeByCode, nearestNode, guessNode, angle } from '../../src/lib/net/nodes.js';
import { globe, netImage, projector, cellOwners, CX, CY } from '../../src/lib/net/globe.js';
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

test('the globe draws front and back lines, dots, the lit region and every node', () => {
  const g = globe({ lat: 37.77, lon: -122.42, lit: 'sfo1' });
  assert.ok(g.front.startsWith('M') && g.back.startsWith('M'));
  assert.ok(g.dots.includes('h.01'));
  assert.ok((g.cells.match(/Z/g) || []).length >= 20, 'San Francisco owns a region of cells');
  assert.ok(globe({ lat: 51.5, lon: 0, lit: 'lhr1' }).cells.length > 0, 'London, hemmed in by Dublin, Paris and Frankfurt, still has a region');
  assert.equal(g.nodes.length, NODES.length);
  const sfo = g.nodes.find((n) => n.code === 'sfo1');
  assert.deepEqual([sfo?.x, sfo?.y, sfo?.front], [CX, CY, true]);
  assert.equal(g.nodes.find((n) => n.code === 'sin1')?.front, false);
  assert.equal(globe({ lat: 0, lon: 0 }).cells, '', 'no lit node, no region');
  assert.ok(g.front.length + g.back.length + g.dots.length + g.cells.length < 30000, 'path data stays small');
  assert.doesNotMatch(g.front, /\.\d/, 'whole units only');
  assert.doesNotMatch(g.front + g.cells, / /, 'no spaces: the path data travels in a data: URI as it is');
});

test('the first frame is a picture: one SVG document per theme in a data: URI, safe in an attribute', () => {
  const g = globe({ lat: 37.77, lon: -122.42, lit: 'sfo1' });
  const light = netImage(g, 'light', 'sfo1');
  const dark = netImage(g, 'dark', 'sfo1');
  assert.ok(light.startsWith('data:image/svg+xml,%3Csvg%20'));
  assert.ok(light.endsWith('%3C/svg%3E'));
  for (const uri of [light, dark]) {
    assert.doesNotMatch(uri, /[#<>" ]/, 'no raw #, <, >, quotes or spaces');
    assert.ok(uri.length < 40000, `size ${uri.length}`);
  }
  assert.notEqual(light, dark);
  assert.ok(light.includes('%23533737') && dark.includes('%23e2c8ee'));
  assert.ok(!netImage(globe({ lat: 0, lon: 0 }), 'light', null).includes("r='28'"), 'no lit node, no halo');
});

test('every cell has one owner and every node owns a cell', () => {
  const own = cellOwners(5);
  assert.equal(own.size, 72 * 36);
  const owners = new Set(own.values());
  for (const n of NODES) assert.ok(owners.has(n.code), `${n.code} owns a cell`);
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
