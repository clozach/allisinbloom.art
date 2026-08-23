import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Home redirects every visit to a random poem drawn from static/route.txt.
const ROUTES = readFileSync(new URL('../static/route.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((r) => r.trim())
  .filter(Boolean);

test.describe('Home redirects to a poem', () => {
  test('landing on / ends up on a route.txt poem', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const slug = new URL(page.url()).pathname.match(/^\/poems\/([^/]+)$/)?.[1];
    expect(slug, `redirected to ${page.url()}, not a poem page`).toBeTruthy();
    expect(ROUTES).toContain(slug);
  });

  test('poem page renders its text with the shader off by default', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[0]}`, { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible();
    // Shader ships off: no canvas until the tuner easter egg enables it
    await expect(page.locator('canvas')).toHaveCount(0);
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
    await page.addInitScript(() =>
      localStorage.setItem('bloom-tune-v1', JSON.stringify({ shaderOn: true }))
    );
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

  // iOS fires height-only resizes while its toolbars slide; under reduced
  // motion the still frame is redrawn each time and must not step the bloom.
  test('height-only resize leaves the rendered bloom pixel-identical', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('bloom-tune-v1', JSON.stringify({ shaderOn: true }));
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
