import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The Net's data is licensed; its credits are a page of their own, reached from the
// poem page once the poem has had its time (the Net itself shows no text).
const ROUTES = readFileSync(new URL('../static/route.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((r) => r.trim())
  .filter(Boolean);

test.describe('Credits', () => {
  test('/credits names the sources with their licences, live', async ({ page }) => {
    const response = await page.goto('/credits', { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible();
    await expect(page.getByText(/TeleGeography/).first()).toBeVisible();
    await expect(page.getByText(/Topology Zoo/).first()).toBeVisible();
    await expect(page.locator('a[href^="https://creativecommons.org/licenses/by-nc-sa/3.0"]').first()).toBeVisible();
    await expect(page.locator('a[href^="https://creativecommons.org/licenses/by/4.0"]').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'The Net' })).toHaveAttribute('href', '/');
    // rel=license names a licence, nothing else
    expect(await page.locator('a[rel~="license"]:not([href^="https://creativecommons.org/licenses/"])').count()).toBe(0);
    expect(await page.locator('a[rel~="license"]').count()).toBeGreaterThan(0);
  });

  test('without JavaScript the Net still carries its credit, and the poem page links to it', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/?node=lhr1');
    const credit = page.locator('#net-credits');
    await expect(credit).toContainText(/TeleGeography/);
    await expect(credit).toContainText(/creativecommons/);
    await expect(credit.getByRole('link', { name: 'Credits' })).toHaveAttribute('href', '/credits');
    await expect(page.locator('.net img.frame.light')).toHaveAttribute('aria-describedby', 'net-credits');
    await page.goto(`/poems/${ROUTES[0]}`);
    await expect(page.getByRole('link', { name: 'credits' })).toHaveAttribute('href', '/credits');
    await ctx.close();
  });

  test('a poem page leads to the credits once it offers its nav; the Net carries the licence in its description', async ({ page }) => {
    await page.goto(`/poems/${ROUTES[0]}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: 'credits' })).toHaveCount(0);
    await page.goto(`/poems/${ROUTES[0]}?afterglow=message`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: 'credits' })).toHaveAttribute('href', '/credits');
    await page.goto('/?node=lhr1', { waitUntil: 'networkidle' });
    await expect(page.locator('.net svg desc')).toContainText(/creativecommons/);
  });
});
