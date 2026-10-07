import { test, expect } from '@playwright/test';

test('backtick opens the three environments on poem and prose pages; Escape closes', async ({ page }) => {
  for (const path of ['/poems/opening-in-sight', '/clearing-song']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.keyboard.press('`');
    const panel = page.getByRole('region', { name: 'Publishing pipeline' });
    await expect(panel).toBeVisible();
    for (const name of ['dev', 'staging', 'production']) {
      await expect(panel.getByRole('link', { name: new RegExp(`^${name} `) })).toBeVisible();
    }
    await expect(panel.getByRole('link', { name: 'CI checks' })).toHaveAttribute('href', /actions\/workflows\/ci.yml$/);
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  }
});

test('typing a backtick in a tuner field does not close the panel or navigate', async ({ page }) => {
  await page.goto('/poems/opening-in-sight', { waitUntil: 'networkidle' });
  await page.keyboard.press('`');
  await page.getByText('shader', { exact: true }).click();
  const field = page.locator('.field').first().locator('input');
  await field.focus();
  await page.keyboard.press('`');
  await expect(page.getByRole('region', { name: 'Publishing pipeline' })).toBeVisible();
  await expect(page).toHaveURL(/opening-in-sight$/);
});

test('dashboard fits a narrow phone viewport and long-press opens it', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/clearing-song', { waitUntil: 'networkidle' });
  const entry = page.getByRole('button', { name: 'Open publishing dashboard' });
  await entry.dispatchEvent('pointerdown', { clientX: 10, clientY: 550 });
  await expect(page.getByRole('region', { name: 'Publishing pipeline' })).toBeVisible();
  await entry.dispatchEvent('pointerup');
  const box = await page.locator('.pipeline-dashboard').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
});
