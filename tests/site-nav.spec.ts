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
  // Since the Net (2026-10-23) a poem page offers nothing at first: the signature
  // is a plain image until the poem has had its time, then the way to the Net.
  test('the signature becomes the home link (the Net), tooltip only, no º suffix', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[1]}?afterglow=message`, { waitUntil: 'networkidle' });
    const sig = page.locator('a.sig-link');
    await expect(sig).toHaveAttribute('href', '/');
    await expect(sig).toHaveAttribute('title', 'The Net');
    await expect(sig).toHaveAccessibleName(/The Net/);
    // unmarked link: the global a::after º must not render on it
    const after = await sig.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(after).toBe('none');
    await sig.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('img', { name: /The Net: a globe of the network's branches/ })).toBeVisible();
  });

  test('the Bluesky butterfly appears with the message, centred, and opens a new tab', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[1]}`, { waitUntil: 'networkidle' });
    await expect(page.locator('.poem-nav')).toHaveCount(0);
    await page.goto(`/poems/${ROUTES[1]}?afterglow=message`, { waitUntil: 'networkidle' });
    const sky = page.locator('.poem-nav a.sky');
    await expect(sky).toHaveAttribute('href', BLUESKY);
    await expect(sky).toHaveAttribute('target', '_blank');
    await expect(sky).toHaveAttribute('rel', /noopener/);
    await expect(sky).toHaveAccessibleName(/Bluesky/);
    const after = await sky.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(after).toBe('none');
    // centred in the nav strip, with no previous/next titles beside it any more
    await expect(page.locator('.nav-link')).toHaveCount(0);
    const [nav, mid] = await Promise.all([page.locator('.nav-links').boundingBox(), sky.boundingBox()]);
    if (!nav || !mid) throw new Error('nav boxes missing');
    const navMid = nav.x + nav.width / 2;
    expect(Math.abs(mid.x + mid.width / 2 - navMid)).toBeLessThanOrEqual(2);
    // ink-coloured, not the accent
    const color = await sky.evaluate((el) => getComputedStyle(el).color);
    const ink = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(color).toBe(ink);
  });

  test('the site-wide º still applies to links in prose', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[1]}`, { waitUntil: 'networkidle' });
    const prose = await page.evaluate(() => {
      const a = document.createElement('a');
      a.href = '/';
      document.body.append(a);
      const c = getComputedStyle(a, '::after').content;
      a.remove();
      return c;
    });
    expect(prose).toContain('º');
  });

  test('the poems index lists what the site navigates and not the layout fixture', async ({ page }) => {
    await page.goto('/poems', { waitUntil: 'networkidle' });
    for (const slug of ROUTES) await expect(page.locator(`a[href="/poems/${slug}"]`).first()).toBeVisible();
    await expect(page.locator('a[href="/poems/width-test"]')).toHaveCount(0);
    const fixture = await page.goto('/poems/width-test', { waitUntil: 'networkidle' });
    expect(fixture?.status()).toBe(200);
  });
});
