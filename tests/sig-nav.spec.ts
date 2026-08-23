import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The signature nav: hover the author line → a calla lily blossoms from the
// signature; click it → a hoverfly lands and the word "home" drops in, a real
// link to the first poem. Every run is pinned: bloom seed, shader still, and
// the sig-nav test hook (placement seed 11, speed 0 = every phase instant).
const ROUTES = readFileSync(new URL('../static/route.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((r) => r.trim())
  .filter(Boolean);
const HOME = `/poems/${ROUTES[0]}`;

const pin = ({ slug, speed }: { slug: string; speed: number }) => {
  localStorage.setItem(`bloom-page-v1:${slug}`, JSON.stringify({ seed: 7 }));
  localStorage.setItem('bloom-prefs-v1', JSON.stringify({ shaderOn: true, animate: false }));
  localStorage.setItem('sig-nav-test', JSON.stringify({ seed: 11, speed }));
};

const open = async (page: Page, slug: string, speed = 0) => {
  await page.addInitScript(pin, { slug, speed });
  await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
};

const kind = (page: Page) => page.evaluate(() => (window as any).__sigNav?.state?.kind ?? null);
const counters = (page: Page) => page.evaluate(() => (window as any).__sigNav?.counters ?? null);

/** How many rendered text lines of `.poem-content` the flower box overlaps (0 is the contract). */
const lineHits = (page: Page) =>
  page.evaluate(() => {
    const flower = document.querySelector('#sig-nav-garden .flower');
    const root = document.querySelector('.poem-content');
    if (!flower || !root) return -1;
    const f = flower.getBoundingClientRect();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let hits = 0;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!/\S/.test(n.nodeValue || '')) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width <= 0 || r.height <= 0) continue;
        if (f.left < r.right && f.right > r.left && f.top < r.bottom && f.bottom > r.top) hits++;
      }
    }
    return hits;
  });

const isPhone = (projectName: string) => projectName === 'iphone';

test.describe('Signature nav (desktop)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'desktop-only behaviour');
  });

  test('hover the author line → the calla blossoms clear of every poem line', async ({ page }) => {
    await open(page, ROUTES[0]);
    expect(await kind(page)).toBe('idle');
    await page.locator('.author').hover();
    await expect.poll(() => kind(page)).toBe('bloomed');
    await expect(page.locator('#sig-nav-garden .flower')).toBeVisible();
    await expect(page.locator('#sig-nav-garden .frame.in')).toHaveCount(7);
    expect(await lineHits(page)).toBe(0);
    await expect(page.locator('a.word')).toHaveCount(0);
  });

  test('click the signature → "home" is a real link to the first poem', async ({ page }) => {
    await open(page, ROUTES[1]);
    await page.locator('.author').hover();
    await page.locator('.sig-button').click();
    await expect.poll(() => kind(page)).toBe('labeled');
    const word = page.locator('a.word');
    await expect(word).toBeVisible();
    await expect(word).toHaveText('home');
    await expect(word).toHaveAttribute('href', HOME);
    await expect(page.getByRole('link', { name: 'home — first poem' })).toBeVisible();
    await expect(page.locator('.sig-button')).toHaveAttribute('aria-expanded', 'true');
    await word.click();
    await expect(page).toHaveURL(HOME);
  });

  test('Mac: a bare ⌃ tap runs the whole show; ⌃h goes home without counting as a tap', async ({ page }) => {
    test.skip(process.platform !== 'darwin', 'the ⌃ layer is Mac-only');
    await open(page, ROUTES[1]);
    await page.keyboard.press('Control');
    await expect.poll(() => kind(page)).toBe('labeled');
    expect(await counters(page)).toEqual({ ctrlTap: 1, ctrlH: 0 });
    await page.keyboard.press('Control+h');
    await expect(page).toHaveURL(HOME);
    await expect.poll(() => counters(page)).toEqual({ ctrlTap: 1, ctrlH: 1 });
    // the garden survived the client-side move
    await expect(page.locator('a.word')).toBeVisible();
  });

  test('keyboard: Tab to the signature blossoms; Enter lands the word and focuses it', async ({ page }) => {
    await open(page, ROUTES[0]);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      if (await page.locator('.sig-button').evaluate((el) => el === document.activeElement)) break;
    }
    await expect(page.locator('.sig-button')).toBeFocused();
    await expect.poll(() => kind(page)).toBe('bloomed');
    await page.keyboard.press('Enter');
    await expect.poll(() => kind(page)).toBe('labeled');
    await expect(page.locator('a.word')).toBeFocused();
  });

  test('the garden survives moving to the next poem without regrowing; a reload clears it', async ({ page }) => {
    await open(page, ROUTES[0]);
    await page.locator('.author').hover();
    await page.locator('.sig-button').click();
    await expect.poll(() => kind(page)).toBe('labeled');
    await page.locator('.poem-nav a.next').click();
    await expect(page).toHaveURL(`/poems/${ROUTES[1]}`);
    await expect.poll(() => kind(page)).toBe('labeled');
    await expect(page.locator('a.word')).toBeVisible();
    await expect(page.locator('#sig-nav-garden .frame.in')).toHaveCount(7);
    expect(await lineHits(page)).toBe(0);
    await page.reload({ waitUntil: 'networkidle' });
    await expect.poll(() => kind(page)).toBe('idle');
    await expect(page.locator('a.word')).toHaveCount(0);
    await expect(page.locator('#sig-nav-garden .flower')).toHaveCount(0);
  });

  for (const width of [320, 375, 1280]) {
    test(`nothing widens the viewport at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, ROUTES[1]);
      await page.locator('.author').hover();
      await page.locator('.sig-button').click();
      await expect.poll(() => kind(page)).toBe('labeled');
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: document.documentElement.clientWidth }));
      expect(m.sw).toBe(m.iw);
      expect(await lineHits(page)).toBe(0);
    });
  }

  test('reduced motion → final pose at once, no sway running', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, ROUTES[0], 1); // real-time speed: only the media query makes it instant
    await page.locator('.author').hover();
    await expect.poll(() => kind(page)).toBe('bloomed');
    await expect(page.locator('#sig-nav-garden .frame.in')).toHaveCount(7);
    const swaying = await page.evaluate(() =>
      [...document.querySelectorAll('.sway')].flatMap((el) => el.getAnimations()).filter((a) => a.playState === 'running').length
    );
    expect(swaying).toBe(0);
  });
});

test.describe('Signature nav (phone)', () => {
  test('one tap grows and labels; badge and hint never show; the word navigates', async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo.project.name), 'phone project only');
    await open(page, ROUTES[1]);
    await page.locator('.sig-button').tap();
    await expect.poll(() => kind(page)).toBe('labeled');
    await expect(page.locator('a.word')).toBeVisible();
    await expect(page.locator('.badge')).toHaveCount(0);
    await expect(page.locator('.hint')).toHaveCount(0);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: document.documentElement.clientWidth }));
    expect(m.sw).toBe(m.iw);
    expect(await lineHits(page)).toBe(0);
    await page.locator('a.word').tap();
    await expect(page).toHaveURL(HOME);
  });
});
