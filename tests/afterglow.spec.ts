import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// A poem page offers nothing until a slow reader could have finished the poem;
// then a message; about ninety seconds later a small picture of the day for the
// reader's region, which fills the viewport when triggered.
const ROUTES = readFileSync(new URL('../static/route.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((r) => r.trim())
  .filter(Boolean);
const POEM = `/poems/${ROUTES[0]}`;

test.describe('Afterglow', () => {
  test('at first the page offers nothing: no links, no buttons, no message', async ({ page }) => {
    await page.goto(POEM, { waitUntil: 'networkidle' });
    await expect(page.locator('.poem-content')).toBeVisible();
    expect(await page.locator('main a, main button:not(.egg)').count()).toBe(0);
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'reading');
    await expect(page.locator('.afterglow .note')).toHaveCount(0);
    await expect(page.locator('span.sig-link')).toHaveCount(1);
    await expect(page.locator('a.sig-link')).toHaveCount(0);
  });

  test('the clock reveals the message, then the picture; the signature becomes the way to the Net', async ({ page }) => {
    await page.clock.install();
    await page.goto(POEM, { waitUntil: 'networkidle' });
    await page.clock.runFor(7000);
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'reading');
    // the four-line poem gets about thirteen seconds for a reader at 138 wpm
    await page.clock.runFor(8000);
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'message');
    await expect(page.locator('.afterglow .note')).toContainText('picture of the day for your region will be ready for you in about 90 seconds');
    await expect(page.locator('.afterglow')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('a.sig-link')).toHaveAttribute('href', '/');
    await expect(page.locator('a.sig-link')).toHaveAccessibleName(/The Net/);
    await expect(page.locator('.poem-nav a.sky')).toBeVisible();
    await page.clock.runFor(75000);
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'message');
    await page.clock.runFor(30000);
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'thumb');
    const thumb = page.getByRole('button', { name: /Allisin's picture of the day for/ });
    await expect(thumb).toBeVisible();
    await expect(thumb).toHaveAccessibleDescription(/\d{4}\. .+/);
    const read = await page.evaluate(() => JSON.parse(localStorage.getItem('net-read-v1') || '{}'));
    expect(Object.keys(read)).toEqual([ROUTES[0]]);
  });

  test('the reading clock runs only while the page is in view', async ({ page }) => {
    await page.clock.install();
    await page.goto(POEM, { waitUntil: 'networkidle' });
    await page.clock.runFor(5000);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(60000);
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'reading');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(6000);
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'reading');
    await page.clock.runFor(5000);
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'message');
  });

  test('the picture fills the viewport, is described, and lets go on Escape or a click', async ({ page }) => {
    await page.goto(`${POEM}?afterglow=thumb`, { waitUntil: 'networkidle' });
    const thumb = page.getByRole('button', { name: /Allisin's picture of the day for/ });
    await expect(thumb).toBeVisible();
    await thumb.click();
    const dialog = page.locator('dialog.picture');
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    const vp = page.viewportSize();
    if (!box || !vp) throw new Error('no dialog');
    expect(box.width).toBeGreaterThanOrEqual(vp.width - 1);
    expect(box.height).toBeGreaterThanOrEqual(vp.height - 1);
    await expect(dialog).toHaveAccessibleDescription(/\d{4}\. .+/);
    expect(await dialog.locator('button').count()).toBe(0); // no dismiss button
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(thumb).toBeFocused();
    await thumb.click();
    await expect(page.locator('dialog.picture')).toBeVisible();
    await page.mouse.click(vp.width / 2, vp.height / 2);
    await expect(page.locator('dialog.picture')).toHaveCount(0);
  });

  test('the tuner reveals the next phase and starts over', async ({ page }) => {
    await page.goto(POEM, { waitUntil: 'networkidle' });
    await page.keyboard.press('`');
    const tuner = page.locator('.tuner');
    await expect(tuner).toBeVisible();
    await tuner.getByRole('button', { name: 'reveal now' }).click();
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'message');
    await tuner.getByRole('button', { name: 'reveal now' }).click();
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'thumb');
    await tuner.getByRole('button', { name: 'start over' }).click();
    await expect(page.locator('.afterglow')).toHaveAttribute('data-phase', 'reading');
    await expect(tuner.locator('.field', { hasText: 'wait for the picture' })).toBeVisible();
  });

  test('without JavaScript the page still leads to the Net', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(POEM);
    await expect(page.getByRole('link', { name: 'The Net' })).toHaveAttribute('href', '/');
    await ctx.close();
  });
});
