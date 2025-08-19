import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Utility to normalize the viewport and wait for fonts to settle
async function prepare(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
  // Ensure fonts are loaded before screenshots
  await page.evaluate(async () => {
    // @ts-ignore
    // Wait for font faces if supported
    if (document?.fonts?.ready) {
      // @ts-ignore
      await document.fonts.ready;
    }
  });
}

// Compare pixel-for-pixel by asserting buffers are exactly equal
// This is stricter than a threshold-based visual diff.
function expectBuffersToBeIdentical(a: Buffer, b: Buffer) {
  expect(a.equals(b), 'Screenshots are not pixel-identical').toBe(true);
}

const HOME = '/';
const POEM = '/poems/opening-in-sight';

test.describe('Home renders the same content as opening-in-sight', () => {
  test('home and poem route are pixel-identical', async ({ page, context, browserName }) => {
    // Capture poem route screenshot first (source of truth)
    await prepare(page);
    await page.goto(POEM, { waitUntil: 'networkidle' });
    const poemPng = await page.screenshot({ fullPage: true });

    // New page for home to avoid scroll state leaks
    const homePage = await context.newPage();
    await prepare(homePage);
    await homePage.goto(HOME, { waitUntil: 'networkidle' });
    const homePng = await homePage.screenshot({ fullPage: true });

    expectBuffersToBeIdentical(homePng, poemPng);
  });
});
