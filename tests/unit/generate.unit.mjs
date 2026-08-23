import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTune, minPaletteContrast, MIN_CONTRAST, contrast, INK, mulberry32 } from '../../src/lib/bloom/generate.js';

test('same seed → identical tune (bit-for-bit)', () => {
  assert.deepEqual(generateTune(7), generateTune(7));
  assert.deepEqual(JSON.stringify(generateTune(0xdeadbeef)), JSON.stringify(generateTune(0xdeadbeef)));
});

test('different seeds → different tunes', () => {
  assert.notDeepEqual(generateTune(1), generateTune(2));
});

test('every palette endpoint clears the contrast floor, 5000 seeds', () => {
  const rnd = mulberry32(42);
  let worst = Infinity;
  for (let i = 0; i < 5000; i++) {
    const seed = Math.floor(rnd() * 4294967296);
    const m = minPaletteContrast(generateTune(seed));
    worst = Math.min(worst, m);
    assert.ok(m >= MIN_CONTRAST, `seed ${seed}: min contrast ${m.toFixed(2)}`);
  }
  console.log(`worst palette contrast over 5000 seeds: ${worst.toFixed(2)}:1`);
});

test('numeric knobs stay inside sane bounds', () => {
  for (let seed = 0; seed < 500; seed++) {
    const t = generateTune(seed);
    assert.ok(t.speed >= 0.5 && t.speed <= 2);
    assert.ok(t.doubling >= 60 && t.doubling <= 240 && Number.isInteger(t.doubling));
    assert.ok(t.phase >= 0 && t.phase <= 1);
    assert.ok(t.lv2 > t.lv1, 'lace levels ordered');
    assert.ok(t.annB > t.annA, 'annulus ordered');
  }
});

test('ink colors mirror the layout tokens', () => {
  assert.equal(INK.light, '#533737');
  assert.ok(contrast(INK.light, '#ffffff') > 7);
  assert.ok(contrast(INK.dark, '#000000') > 7);
});
