import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Home redirects every visit to a random poem drawn from static/route.txt.
const ROUTES = readFileSync(new URL('../static/route.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((r) => r.trim())
  .filter(Boolean);

// Pin a poem's bloom seed before the app boots: the generator is
// deterministic, so `{ seed }` alone reproduces the whole tune.
const seedPage = ({ slug, seed }: { slug: string; seed: number }) =>
  localStorage.setItem(`bloom-page-v1:${slug}`, JSON.stringify({ seed }));

// keep the GL buffer readable after the frame so a test can hash it
const keepBuffer = () => {
  const orig = HTMLCanvasElement.prototype.getContext;
  // @ts-ignore
  HTMLCanvasElement.prototype.getContext = function (t, o) {
    return orig.call(this, t, { ...(o || {}), preserveDrawingBuffer: true });
  };
};
const hashCanvas = () =>
  new Promise<number | null>((resolve) => {
    const c = document.querySelector('canvas');
    if (!c) return resolve(null);
    const o = document.createElement('canvas');
    o.width = c.width;
    o.height = Math.min(c.height, 600);
    const g = o.getContext('2d');
    if (!g) return resolve(null);
    g.drawImage(c, 0, 0);
    const d = g.getImageData(0, 0, o.width, o.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] + d[i + 2]) >>> 0;
    resolve(h);
  });

test.describe('Home redirects to a poem', () => {
  test('landing on / ends up on a route.txt poem', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const slug = new URL(page.url()).pathname.match(/^\/poems\/([^/]+)$/)?.[1];
    expect(slug, `redirected to ${page.url()}, not a poem page`).toBeTruthy();
    expect(ROUTES).toContain(slug);
  });

  test('poem page renders its text over a (still) bloom by default', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[0]}`, { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible();
    // Shader ships ON, animation OFF: a canvas is there, its clock frozen
    await expect(page.locator('canvas')).toHaveCount(1);
    const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('bloom-prefs-v1') || '{}'));
    expect(prefs.animate ?? false).toBe(false);
  });

  // Stanza breaks are load-bearing: every blank line in a poem's source must
  // survive as a visible gap. Guards against resets/styles fusing stanzas.
  for (const slug of ROUTES) {
    test(`stanzas of ${slug} render as separated paragraphs`, async ({ page }) => {
      await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
      const paragraphs = page.locator('.poem-content p');
      const count = await paragraphs.count();
      if (count === 0) {
        // Code-block-authored poem: whitespace survives via pre-wrap instead
        await expect(page.locator('.poem-content pre')).toHaveCount(1);
        return;
      }
      if (count < 2) return; // single-stanza poem: nothing to separate
      // Visible gap between consecutive stanzas must exceed the line pitch,
      // i.e. a stanza break must read as more than an ordinary line break.
      const first = await paragraphs.nth(0).boundingBox();
      const second = await paragraphs.nth(1).boundingBox();
      if (!first || !second) throw new Error('stanza bounding boxes missing');
      const gap = second.y - (first.y + first.height);
      const lineHeight = await paragraphs
        .nth(0)
        .evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
      expect(gap, `gap ${gap}px vs line-height ${lineHeight}px`).toBeGreaterThan(
        lineHeight * 0.5
      );
    });
  }
});

// The bloom tuner's touch front door: a long-press on the invisible
// bottom-left hotspot opens it (phones have no ` key); ✕ closes it.
test.describe('Bloom tuner on touch', () => {
  test('long-press hotspot opens the tuner, ✕ closes it', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[0]}`, { waitUntil: 'networkidle' });
    await expect(page.locator('.tuner')).toHaveCount(0);
    const vp = page.viewportSize();
    if (!vp) throw new Error('no viewport');
    // short tap does nothing
    await page.mouse.move(20, vp.height - 20);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(150);
    await expect(page.locator('.tuner')).toHaveCount(0);
    // hold for the long-press threshold
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    await expect(page.locator('.tuner')).toBeVisible();
    await expect(page.locator('.tuner .row span').first()).toHaveText('shader');
    await page.getByRole('button', { name: 'Close bloom tuner' }).click();
    await expect(page.locator('.tuner')).toHaveCount(0);
  });
});

// The shader must scroll WITH the text: a viewport-fixed canvas re-sized
// under iOS toolbar collapse and re-zoomed the lace beneath every glyph.
test.describe('Bloom shader anchoring', () => {
  test('canvas spans the document and ignores scrolling', async ({ page }) => {
    await page.addInitScript(seedPage, { slug: ROUTES[ROUTES.length - 1], seed: 7 });
    await page.goto(`/poems/${ROUTES[ROUTES.length - 1]}`, { waitUntil: 'networkidle' });
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveCount(1);
    const measure = () =>
      page.evaluate(() => {
        const c = document.querySelector('canvas');
        const cloud = c?.parentElement;
        return {
          px: c ? [c.width, c.height] : null,
          position: cloud ? getComputedStyle(cloud).position : null,
          coversDocument: cloud ? cloud.offsetHeight >= document.body.offsetHeight : false,
        };
      });
    const top = await measure();
    expect(top.position).toBe('absolute');
    expect(top.coversDocument).toBe(true);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(250);
    const scrolled = await measure();
    expect(scrolled.px).toEqual(top.px);
  });

  // A short poem (page shorter than the viewport) must still get a canvas that
  // fills the viewport — and keep filling it when the window grows.
  test('short poem: canvas fills the viewport, before and after a window grow', async ({ page }) => {
    await page.addInitScript(seedPage, { slug: ROUTES[0], seed: 7 });
    await page.setViewportSize({ width: 980, height: 945 });
    await page.goto(`/poems/${ROUTES[0]}`, { waitUntil: 'networkidle' });
    const measure = () =>
      page.evaluate(() => {
        const c = document.querySelector('canvas');
        return { canvasCssH: c?.clientHeight ?? 0, vh: innerHeight, cloudH: c?.parentElement?.offsetHeight ?? 0 };
      });
    let m = await measure();
    expect(m.canvasCssH).toBeGreaterThanOrEqual(m.vh);
    expect(m.canvasCssH).toBe(m.cloudH);
    await page.setViewportSize({ width: 980, height: 1400 });
    await page.waitForTimeout(400);
    m = await measure();
    expect(m.canvasCssH).toBeGreaterThanOrEqual(1400);
    expect(m.canvasCssH).toBe(m.cloudH);
  });

  // iOS fires height-only resizes while its toolbars slide; under reduced
  // motion the still frame is redrawn each time and must not step the bloom.
  test('height-only resize leaves the rendered bloom pixel-identical', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.addInitScript(seedPage, { slug: ROUTES[ROUTES.length - 1], seed: 7 });
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      // keep the GL buffer readable after the frame so the test can hash it
      // @ts-ignore
      HTMLCanvasElement.prototype.getContext = function (t, o) {
        return orig.call(this, t, { ...(o || {}), preserveDrawingBuffer: true });
      };
    });
    await page.goto(`/poems/${ROUTES[ROUTES.length - 1]}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const ROWS = 800; // fixed region: the page may gain rows at the bottom, never the top
    const hashTop = () =>
      page.evaluate((rows) => {
        const c = document.querySelector('canvas');
        if (!c || c.height < rows) return null;
        const o = document.createElement('canvas');
        o.width = c.width;
        o.height = rows;
        const g = o.getContext('2d');
        if (!g) return null;
        g.drawImage(c, 0, 0);
        const d = g.getImageData(0, 0, o.width, rows).data;
        let h = 0;
        for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] + d[i + 2]) >>> 0;
        return h;
      }, ROWS);
    const before = await hashTop();
    expect(before).not.toBeNull();
    await page.setViewportSize({ width: 390, height: 760 });
    await page.waitForTimeout(400);
    expect(await hashTop()).toBe(before);
    await ctx.close();
  });
});

// Each poem's bloom is generated from a seed rolled on first visit and
// persisted per page; a pinned seed reproduces the frame bit-for-bit.
test.describe('Per-poem seeded bloom', () => {
  test('first visit rolls + stores a seed; the same seed survives reload', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[0]}`, { waitUntil: 'networkidle' });
    const key = `bloom-page-v1:${ROUTES[0]}`;
    const rec = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
    expect(typeof rec?.seed).toBe('number');
    expect(rec.current).toBeUndefined(); // the seed IS the default; no edits yet
    await page.reload({ waitUntil: 'networkidle' });
    const again = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
    expect(again.seed).toBe(rec.seed);
  });

  test('two poems roll different seeds', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[0]}`, { waitUntil: 'networkidle' });
    await page.goto(`/poems/${ROUTES[1]}`, { waitUntil: 'networkidle' });
    const seeds = await page.evaluate((slugs) =>
      slugs.map((s) => JSON.parse(localStorage.getItem(`bloom-page-v1:${s}`) || '{}').seed), ROUTES.slice(0, 2));
    expect(seeds[0]).not.toBe(seeds[1]);
  });

  test('pinned seed → pixel-identical frame across fresh contexts; another seed differs', async ({ browser }) => {
    const frame = async (seed: number) => {
      const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.addInitScript(keepBuffer);
      await page.addInitScript(seedPage, { slug: ROUTES[0], seed });
      await page.goto(`/poems/${ROUTES[0]}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const h = await page.evaluate(hashCanvas);
      await ctx.close();
      return h;
    };
    const a = await frame(7);
    expect(a).not.toBeNull();
    expect(await frame(7)).toBe(a);
    expect(await frame(8)).not.toBe(a);
  });

  test('tuner nests shader ▸ animate ▸ motion sliders; dice + revert act on this poem only', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[1]}`, { waitUntil: 'networkidle' });
    await page.addInitScript(seedPage, { slug: ROUTES[0], seed: 7 });
    await page.goto(`/poems/${ROUTES[0]}`, { waitUntil: 'networkidle' });
    await page.keyboard.press('`');
    const tuner = page.locator('.tuner');
    await expect(tuner).toBeVisible();
    const rowLabels = () => tuner.locator('.row span').allTextContents();
    let labels = await rowLabels();
    expect(labels).toContain('animate');
    expect(labels).not.toContain('time multiplier'); // hidden while animate is off
    expect(labels).toContain('moment in the loop');
    await tuner.getByText('animate', { exact: true }).click();
    labels = await rowLabels();
    expect(labels).toContain('time multiplier');
    expect(labels).toContain('seconds per doubling');
    // shader off hides everything beneath it
    await tuner.getByText('shader', { exact: true }).click();
    labels = await rowLabels();
    expect(labels).not.toContain('animate');
    expect(labels).not.toContain('moment in the loop');
    await expect(page.locator('canvas')).toHaveCount(0);
    await tuner.getByText('shader', { exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(1);

    const record = (slug: string) =>
      page.evaluate((s) => JSON.parse(localStorage.getItem(`bloom-page-v1:${s}`) || '{}'), slug);
    const born = await record(ROUTES[0]);
    expect(born.seed).toBe(7);
    expect(born.current).toBeUndefined(); // pinned page, untouched: no edited layer
    const otherBefore = await record(ROUTES[1]);

    // motion dice: only speed/doubling move, seed stays
    await tuner.getByRole('button', { name: "Reroll this poem's motion" }).click();
    let rec = await record(ROUTES[0]);
    expect(rec.seed).toBe(7);
    expect(rec.current).toBeTruthy();
    const after = rec.current;
    expect([after.speed, after.doubling]).not.toEqual([born.speed, born.doubling]);
    // blot dice: still knobs + palette move, motion keeps its last roll
    await tuner.getByRole('button', { name: "Reroll this poem's blot" }).click();
    rec = await record(ROUTES[0]);
    expect(rec.seed).toBe(7);
    expect([rec.current.speed, rec.current.doubling]).toEqual([after.speed, after.doubling]);
    expect(rec.current.lightGroundA).not.toBe(after.lightGroundA);
    expect(rec.current.zoom).not.toBe(after.zoom);
    // revert: the edited layer is gone, the default seed remains
    await tuner.getByRole('button', { name: 'revert' }).click();
    rec = await record(ROUTES[0]);
    expect(rec).toEqual({ seed: 7 });
    await expect(tuner.locator('.group').first()).toHaveText('this poem · seed 7');
    // the other poem never changed
    expect(await record(ROUTES[1])).toEqual(otherBefore);
  });
});
