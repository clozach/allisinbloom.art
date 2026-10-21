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
    const source = page.locator('.source');
    await source.locator('summary').click();
    expect(await source.locator('a').first().getAttribute('href')).toBe(draft.sourceUrl);
    if (draft.status !== 'verified_latest_in_poems') await expect(source).toContainText('unconfirmed');
  }
  await page.goto('/review/poems', { waitUntil: 'networkidle' });
  await expect(page.locator('.poem-link')).toHaveCount(drafts.length);
  await expect(page.getByRole('heading', { name: 'Latest Notion source still needed' })).toBeVisible();
});

test('a poem with its own route keeps its own line rhythm, and only there', async ({ page }) => {
  const styled = drafts.find(draft => draft.slug === 'all-i-know');
  const plain = drafts.find(draft => draft.slug !== 'all-i-know' && draft.format === 'notion-paragraphs');
  test.skip(!styled || !plain, 'Private source files are intentionally absent from public CI');
  const rhythm = () => page.locator('.notion-poem .verse').first().evaluate(element => {
    const style = getComputedStyle(element);
    return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
  });
  await page.goto('/poems/all-i-know', { waitUntil: 'networkidle' });
  expect(await page.locator('.notion-poem .verse').textContent()).toBe(styled.sourceText);
  expect(await rhythm()).toBeCloseTo(2, 1);
  // Leave by client-side navigation: Svelte's scoping keeps the rhythm from following.
  await page.locator('.source summary').click();
  await page.locator('.source a[href="/review/poems"]').click();
  await page.locator(`.poem-link[href="/poems/${plain.slug}"]`).click();
  await expect(page).toHaveURL(`/poems/${plain.slug}`);
  expect(await rhythm()).toBeCloseTo(1.6, 1);
});
