import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Site nav (2026-08-23): the signature is the home link (first poem in
// route.txt, named only by its tooltip), and a Bluesky butterfly sits centred
// between the previous/next poem titles.
const ROUTES = readFileSync(new URL('../static/route.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((r) => r.trim())
  .filter(Boolean);
const BLUESKY = 'https://bsky.app/profile/allisinbloom.bsky.social';

test.describe('Site nav', () => {
  test('the signature links home (first poem), tooltip only, no º suffix', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[1]}`, { waitUntil: 'networkidle' });
    const sig = page.locator('a.sig-link');
    await expect(sig).toHaveAttribute('href', `/poems/${ROUTES[0]}`);
    await expect(sig).toHaveAttribute('title', 'home');
    await expect(sig).toHaveAccessibleName(/home/);
    // unmarked link: the global a::after º must not render on it
    const after = await sig.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(after).toBe('none');
    await sig.click();
    await expect(page).toHaveURL(new RegExp(`/poems/${ROUTES[0]}$`));
  });

  test('the Bluesky butterfly sits between the poem titles and opens a new tab', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[1]}`, { waitUntil: 'networkidle' });
    const sky = page.locator('.poem-nav a.sky');
    await expect(sky).toHaveAttribute('href', BLUESKY);
    await expect(sky).toHaveAttribute('target', '_blank');
    await expect(sky).toHaveAttribute('rel', /noopener/);
    await expect(sky).toHaveAccessibleName(/Bluesky/);
    const after = await sky.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(after).toBe('none');
    // centred: between the previous and next links, horizontally
    const [prev, mid, next] = await Promise.all([
      page.locator('.nav-link.prev').boundingBox(),
      sky.boundingBox(),
      page.locator('.nav-link.next').boundingBox()
    ]);
    if (!prev || !mid || !next) throw new Error('nav boxes missing');
    expect(mid.x).toBeGreaterThan(prev.x + prev.width);
    expect(mid.x + mid.width).toBeLessThan(next.x);
    // ink-coloured, not the accent
    const color = await sky.evaluate((el) => getComputedStyle(el).color);
    const ink = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(color).toBe(ink);
  });

  test('the butterfly is still there on the first and last poems', async ({ page }) => {
    for (const slug of [ROUTES[0], ROUTES[ROUTES.length - 1]]) {
      await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
      await expect(page.locator('.poem-nav a.sky')).toBeVisible();
    }
  });
});
