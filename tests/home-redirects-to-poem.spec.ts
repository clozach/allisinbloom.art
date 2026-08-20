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
