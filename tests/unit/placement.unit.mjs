import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mulberry32,
  intersects,
  clampToViewport,
  candidates,
  place,
  roomReport,
  EDGE_PAD,
  OBSTACLE_GAP,
  ROOT_OVERLAP,
  SCALES
} from '../../src/lib/sig-nav/placement.js';

const SIZE = { w: 120, h: 160 };

/** A poem page: title, `widths.length` text lines, author line with the signature, nav below. */
function poemFixture({ pageWidth, columnX, columnW, lineH, widths, sig, strip, byW = 24, gap = 8, titleY = 200 }) {
  const obstacles = [{ id: 'title', x: columnX, y: titleY - 4, w: 320, h: 48 }];
  const top = titleY + 40 + 20;
  widths.forEach((w, i) => obstacles.push({ id: `line:${i}`, x: columnX - 4, y: top + i * lineH - 4, w: w + 8, h: lineH + 8 }));
  const lastBottom = top + widths.length * lineH;
  const anchor = { x: columnX + byW + gap, y: lastBottom + strip, w: sig.w, h: sig.h };
  obstacles.push({ id: 'author', x: columnX, y: anchor.y, w: byW + gap + sig.w, h: sig.h });
  obstacles.push({ id: 'nav', x: columnX, y: anchor.y + anchor.h + 37, w: columnW, h: 52 });
  return { anchor, obstacles, pageWidth, columnRight: columnX + columnW };
}

const desktop = poemFixture({
  pageWidth: 1280, columnX: 240, columnW: 800, lineH: 34.56,
  widths: [500, 620, 450, 580, 300, 610, 540, 470, 600, 520, 380, 180],
  sig: { w: 144, h: 32 }, strip: 57.6
});
const phone = poemFixture({
  pageWidth: 390, columnX: 20, columnW: 350, lineH: 24.2,
  widths: [300, 340, 280, 320, 200, 330, 310, 290, 335, 90, 100, 80],
  sig: { w: 94, h: 21 }, strip: 49, byW: 13, gap: 4
});
const long = (() => {
  const widths = Array.from({ length: 40 }, (_, i) => 300 + ((i * 137) % 420));
  return poemFixture({ pageWidth: 1280, columnX: 240, columnW: 800, lineH: 34.56, widths, sig: { w: 144, h: 32 }, strip: 57.6, titleY: 225 });
})();
assert.ok(long.anchor.y > 1700 && long.anchor.y < 1760, `long poem signature sits at y≈1725 (got ${long.anchor.y})`);

const desktopVp = { x: 0, y: 0, w: 1280, h: 1000 };
const phoneVp = { x: 0, y: 0, w: 390, h: 844 };

function assertSound(fixture, p) {
  const { rect } = p;
  assert.ok(rect.x >= EDGE_PAD && rect.x + rect.w <= fixture.pageWidth - EDGE_PAD, `inside page: ${JSON.stringify(rect)}`);
  assert.ok(rect.y >= EDGE_PAD, 'below the top edge');
  for (const o of fixture.obstacles) {
    if (o.id === 'author') continue;
    assert.ok(!intersects(rect, o, OBSTACLE_GAP), `${p.id} hits ${o.id}`);
  }
  const a = fixture.anchor;
  const sigBody = { x: a.x, y: a.y + ROOT_OVERLAP, w: a.w, h: a.h - ROOT_OVERLAP };
  assert.ok(!intersects(rect, sigBody), `${p.id} covers the signature beyond its top ${ROOT_OVERLAP} px`);
}

test('mulberry32 is deterministic and in [0,1)', () => {
  const a = mulberry32(11), b = mulberry32(11);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test('intersects: touching edges are not an intersection; gap grows the rects', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(intersects(a, { x: 10, y: 0, w: 10, h: 10 }), false);
  assert.equal(intersects(a, { x: 10, y: 0, w: 10, h: 10 }, 1), true);
  assert.equal(intersects(a, { x: 5, y: 5, w: 10, h: 10 }), true);
});

test('clampToViewport keeps a rect inside the viewport with padding', () => {
  const vp = { x: 0, y: 500, w: 390, h: 844 };
  assert.deepEqual(clampToViewport({ x: 380, y: 100, w: 50, h: 20 }, vp), { x: 332, y: 508, w: 50, h: 20 });
  assert.deepEqual(clampToViewport({ x: -20, y: 2000, w: 50, h: 20 }, vp, 4), { x: 4, y: 1320, w: 50, h: 20 });
});

test('every candidate strategy is represented and ordered above → beside → ragged → gutter', () => {
  const cs = candidates({ ...desktop, size: SIZE });
  const order = ['above', 'beside', 'ragged', 'gutter'];
  let rank = 0;
  for (const c of cs) {
    const r = order.indexOf(c.strategy);
    assert.ok(r >= rank, `strategy order broke at ${c.id}`);
    rank = r;
  }
  for (const s of order) assert.ok(cs.some((c) => c.strategy === s), `has ${s}`);
  assert.equal(candidates({ ...phone, size: SIZE }).filter((c) => c.strategy === 'gutter').length, 0, 'phones have no gutter');
});

for (const [name, fixture, vp] of [['desktop', desktop, desktopVp], ['phone', phone, phoneVp], ['long', long, desktopVp]]) {
  test(`${name}: placements never hit text, the signature body, or the page edges (200 seeds × ${SCALES.length} scales)`, () => {
    let placed = 0;
    for (const scale of SCALES) {
      const size = { w: Math.round(SIZE.w * scale), h: Math.round(SIZE.h * scale) };
      for (let seed = 0; seed < 200; seed++) {
        const { placement, free, tried } = place({ ...fixture, viewport: vp, size, rng: mulberry32(seed) });
        assert.ok(tried.length > free.length || free.length === tried.length);
        for (const c of tried) assert.equal(c.free, c.hits.length === 0);
        if (!placement) continue;
        placed++;
        assertSound(fixture, placement);
        const pool = free.filter((c) => c.strategy === placement.strategy);
        assert.equal(free[0].strategy, placement.strategy, 'picked from the first strategy with room');
        const inView = pool.filter((c) => c.rect.y >= vp.y && c.rect.y + c.rect.h <= vp.y + vp.h && c.rect.x >= vp.x && c.rect.x + c.rect.w <= vp.x + vp.w);
        if (inView.length) assert.ok(inView.some((c) => c.id === placement.id), 'prefers an on-screen candidate when one exists');
      }
    }
    assert.ok(placed > 0, `${name} places at some scale`);
  });
}

test('seeded → deterministic', () => {
  const a = place({ ...desktop, viewport: desktopVp, size: SIZE, rng: mulberry32(7) });
  const b = place({ ...desktop, viewport: desktopVp, size: SIZE, rng: mulberry32(7) });
  assert.deepEqual(a, b);
  const c = place({ ...desktop, viewport: desktopVp, size: SIZE, rng: mulberry32(8) });
  assert.ok(c.placement, 'desktop has room at full size');
});

test('long poem: off-screen signature still places; on-screen viewport picks on-screen', () => {
  const off = place({ ...long, viewport: desktopVp, size: SIZE, rng: mulberry32(3) });
  assert.ok(off.placement, 'still places when nothing is on screen');
  const near = { x: 0, y: long.anchor.y - 700, w: 1280, h: 1000 };
  for (let seed = 0; seed < 50; seed++) {
    const { placement } = place({ ...long, viewport: near, size: SIZE, rng: mulberry32(seed) });
    assert.ok(placement, 'places');
    const r = placement.rect;
    assert.ok(r.y >= near.y && r.y + r.h <= near.y + near.h, `on screen: ${placement.id}`);
  }
});

test('phone: no room at full size (as measured live at 390 px); 0.75× lands beside the signature', () => {
  const at = (scale) => place({ ...phone, viewport: phoneVp, size: { w: Math.round(SIZE.w * scale), h: Math.round(SIZE.h * scale) }, rng: mulberry32(1) }).placement;
  assert.equal(at(1), null);
  const p = at(0.75);
  assert.ok(p, 'fits at 0.75×');
  assert.equal(p.strategy, 'beside');
  assertSound(phone, p);
  assert.equal(p.origin.x, phone.anchor.x + phone.anchor.w, 'stem roots at the signature end');
});

test('ragged candidates stay inside the poem column (+16 px); gutter ones sit past it', () => {
  const cs = candidates({ ...desktop, size: SIZE });
  for (const c of cs) {
    if (c.strategy === 'ragged') assert.ok(c.rect.x + c.rect.w <= desktop.columnRight + 16, c.id);
    if (c.strategy === 'gutter') assert.ok(c.rect.x >= desktop.columnRight + 16, c.id);
  }
  assert.ok(cs.some((c) => c.strategy === 'ragged'), 'the short last line opens ragged room');
});

test('nothing free → null placement with hits on every candidate', () => {
  const wall = { ...desktop, obstacles: [...desktop.obstacles, { id: 'flower:0', x: 0, y: 0, w: 1280, h: 3000 }] };
  const { placement, free, tried } = place({ ...wall, viewport: desktopVp, size: SIZE, rng: mulberry32(1) });
  assert.equal(placement, null);
  assert.equal(free.length, 0);
  assert.ok(tried.length > 0 && tried.every((c) => c.hits.includes('flower:0')));
});

test('roomReport: counts are monotonic in scale (smaller → ≥ candidates), per strategy and in total', () => {
  for (const [fixture, vp] of [[desktop, desktopVp], [phone, phoneVp], [long, desktopVp]]) {
    const { sizes } = roomReport({ ...fixture, viewport: vp, size: SIZE });
    assert.deepEqual(sizes.map((s) => s.scale), SCALES);
    for (let i = 1; i < sizes.length; i++) {
      const big = sizes[i - 1].strategies, small = sizes[i].strategies;
      for (const k of ['above', 'beside', 'ragged', 'gutter']) assert.ok(small[k] >= big[k], `${k}: ${small[k]} ≥ ${big[k]} at ${sizes[i].scale}`);
      const sum = (s) => Object.values(s).reduce((a, b) => a + b, 0);
      assert.ok(sum(small) >= sum(big));
    }
  }
});
