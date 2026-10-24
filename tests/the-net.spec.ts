import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';

// The Net (2026-10-23): / is a wire-frame Earth with the network's nodes; the one
// that answered is lit, and the page's one offer, "Poem?", appears on hover, tap
// or focus. The dev server has no network headers, so `?node=` lights a node.
const ROUTES = readFileSync(new URL('../static/route.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((r) => r.trim())
  .filter(Boolean);
const draftDirectory = new URL('../src/lib/server/drafts/', import.meta.url);
const AVAILABLE = [...ROUTES, ...readdirSync(draftDirectory)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(new URL(file, draftDirectory), 'utf8')).slug)];

test.describe('The Net', () => {
  test('/ shows the wire globe, lit for the node asked for, and offers a poem the site has', async ({ page }) => {
    const response = await page.goto('/?node=sfo1', { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/');
    const globe = page.getByRole('img', { name: /The Net: a globe of the network's branches/ });
    await expect(globe).toBeVisible();
    await expect(globe).toHaveAccessibleName(/globe of the network's branches, \d+ hubs and \d+ links\. San Francisco answered you; it is lit/);
    await expect(page.locator('.net .glow .full')).toHaveAttribute('d', /^M/);
    await expect(page.locator('.net .lit')).toHaveCount(1);
    await expect(page.locator('.net svg > circle:not(.lit):not(.halo)')).toHaveCount(0); // no outline around the Earth
    await expect(page.locator('.net')).toHaveAttribute('data-license', /creativecommons/);
    const ask = page.getByRole('link', { name: 'Poem?' });
    const slug = (await ask.getAttribute('href'))?.match(/^\/poems\/([^/]+)$/)?.[1];
    expect(AVAILABLE).toContain(slug);
    // nothing else on the page is interactive: the credit's link is out of the Tab order
    expect(await page.locator('main a:not([tabindex="-1"]), main button').count()).toBe(1);
  });

  test('the offer is hidden until the Earth is hovered or the offer is focused', async ({ page }) => {
    await page.goto('/?node=lhr1', { waitUntil: 'networkidle' });
    const ask = page.getByRole('link', { name: 'Poem?' });
    expect(await ask.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    await page.keyboard.press('Tab');
    await expect(ask).toBeFocused();
    await expect.poll(() => ask.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await page.mouse.click(5, 5); // blur
    await page.mouse.move(5, 5);
    await expect.poll(() => ask.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    const box = await page.locator('.net svg').boundingBox();
    if (!box) throw new Error('no globe');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => ask.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('the arrow keys turn the Earth from the offer; Home brings the lit node back; Enter opens the poem', async ({ page }) => {
    await page.goto('/?node=hnd1', { waitUntil: 'networkidle' });
    const front = page.locator('.net .hubs.front');
    const before = await front.getAttribute('d');
    const litBefore = await page.locator('.net .lit').getAttribute('cx');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await front.getAttribute('d')).not.toBe(before);
    expect(await page.locator('.net .lit').getAttribute('cx')).not.toBe(litBefore);
    await page.keyboard.press('Home');
    expect(await page.locator('.net .lit').getAttribute('cx')).toBe(litBefore);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/poems\//);
  });

  test('a drag turns the Earth; a tap reveals the offer', async ({ page }) => {
    await page.goto('/?node=gru1', { waitUntil: 'networkidle' });
    const front = page.locator('.net .hubs.front');
    const before = await front.getAttribute('d');
    const box = await page.locator('.net svg').boundingBox();
    if (!box) throw new Error('no globe');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy + 30, { steps: 6 });
    await page.mouse.up();
    expect(await front.getAttribute('d')).not.toBe(before);
    await expect(page.locator('.net')).not.toHaveClass(/revealed/);
    // a slow drag is still a drag: one pixel per step, forty steps
    await page.mouse.move(cx, cy + 40);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 40, { steps: 40 });
    await page.mouse.up();
    await expect(page.locator('.net')).not.toHaveClass(/revealed/);
    // a still tap (no movement) counts as a touch and reveals the offer
    await page.mouse.move(cx - 60, cy - 60);
    await page.mouse.down();
    await page.mouse.up();
    await expect(page.locator('.net')).toHaveClass(/revealed/);
  });

  test('two visits in the same minute from the same node are offered the same poem', async ({ page }) => {
    const hrefs = new Set<string | null>();
    for (let i = 0; i < 2; i++) {
      await page.goto('/?node=cdg1', { waitUntil: 'networkidle' });
      hrefs.add(await page.getByRole('link', { name: 'Poem?' }).getAttribute('href'));
    }
    // a minute boundary between the two visits is the one way this differs
    expect(hrefs.size).toBeLessThanOrEqual(2);
  });

  test('without a node, the browser guesses one from its clock', async ({ browser }) => {
    const ctx = await browser.newContext({ timezoneId: 'Asia/Tokyo' });
    const page = await ctx.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('.net')).toHaveAttribute('data-lit', 'hnd1');
    await expect(page.getByRole('img', { name: /Tokyo answered you/ })).toBeVisible();
    await ctx.close();
  });

  test('the Net needs no JavaScript to show itself: the server frame is a picture', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/?node=syd1');
    await expect(page.getByRole('img', { name: /Sydney answered you/ })).toBeVisible();
    await expect(page.locator('.net img.frame.light')).toHaveAttribute('src', /^data:image\/svg\+xml,/);
    await expect(page.locator('.net img.frame.light')).toBeVisible();
    await expect(page.locator('.net img.frame.dark')).toBeHidden();
    await expect(page.locator('.net svg')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Poem?' })).toHaveAttribute('href', /^\/poems\//);
    await ctx.close();
  });

  test('once the page runs, the live paths replace the picture, and the dark frame shows in dark mode', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    const warnings: string[] = [];
    page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(m.text()); });
    await page.goto('/?node=syd1', { waitUntil: 'networkidle' });
    await expect(page.locator('.net path.hubs.front')).toHaveCount(1);
    await expect(page.locator('.net path.arc')).toHaveCount(5);
    await expect(page.locator('.net img.frame')).toHaveCount(0);
    expect(warnings.filter((w) => /hydration/i.test(w))).toEqual([]);
    await ctx.close();
  });
});
