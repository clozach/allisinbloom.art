import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
const directory = new URL('../src/lib/server/drafts/', import.meta.url);
const drafts = readdirSync(directory).filter(file => file.endsWith('.json')).map(file => JSON.parse(readFileSync(new URL(file, directory), 'utf8')));

test('private source text, layout and inventory survive every imported poem', async ({ page }) => {
  test.skip(!drafts.length, 'Private source files are intentionally absent from public CI');
  test.setTimeout(180_000);
  for (const draft of drafts) {
    const response = await page.goto(`/poems/${draft.slug}`, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    expect(response?.headers()['cache-control']).toContain('no-store');
    const poem = page.locator('.notion-poem');
    if (['preformatted', 'title-poem'].includes(draft.format)) {
      expect(await poem.locator('.verse').textContent()).toBe(draft.sourceText);
    }
    const overflow = await poem.evaluate(element => element.scrollWidth > element.clientWidth + 2);
    expect(overflow, `Overflow: ${draft.slug}`).toBe(false);
    await expect(page.locator('.source, .review-notice')).toHaveCount(0);
  }
  await page.goto('/review/poems', { waitUntil: 'networkidle' });
  await expect(page.locator('.poem-link')).toHaveCount(drafts.length);
  await expect(page.getByRole('heading', { name: 'Latest Notion source still needed' })).toBeVisible();
});

test('a poem with its own route keeps its own line rhythm, and only there', async ({ page }) => {
  const styled = drafts.find(draft => draft.slug === 'all-i-know');
  test.skip(!styled, 'Private source files are intentionally absent from public CI');
  const rhythm = () => page.locator('.notion-poem .verse').first().evaluate(element => {
    const style = getComputedStyle(element);
    return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
  });
  await page.goto('/poems/all-i-know', { waitUntil: 'networkidle' });
  expect(await page.locator('.notion-poem .verse').textContent()).toBe(styled.sourceText);
  expect(await rhythm()).toBeCloseTo(2.8, 1);
  // A neighbour loaded on its own gives the rhythm it should keep.
  const next = '/poems/opening-in-sight';
  await page.goto(next, { waitUntil: 'networkidle' });
  const own = await rhythm();
  expect(own).not.toBeCloseTo(2.8, 1);
  // Leave all i know by client-side navigation (the signature to the Net, the Net's offer
  // to a poem): Svelte's scoping keeps its rhythm from following. The Net offers poems by
  // node and minute, so try nodes until the offer is not all i know itself.
  await page.goto('/poems/all-i-know?afterglow=message', { waitUntil: 'networkidle' });
  await page.locator('a.sig-link').click();
  await expect(page).toHaveURL(/\/$/);
  let offered = await page.getByRole('link', { name: 'Poem?' }).getAttribute('href');
  for (const node of ['sfo1', 'lhr1', 'hnd1', 'syd1', 'gru1', 'cpt1']) {
    if (offered !== '/poems/all-i-know') break;
    await page.goto(`/?node=${node}`, { waitUntil: 'networkidle' });
    offered = await page.getByRole('link', { name: 'Poem?' }).getAttribute('href');
  }
  expect(offered).not.toBe('/poems/all-i-know');
  await page.getByRole('link', { name: 'Poem?' }).click();
  await expect(page).toHaveURL(offered!);
  expect(await rhythm()).not.toBeCloseTo(2.8, 1);
});
