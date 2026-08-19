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
});
