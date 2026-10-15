import { test, expect } from '@playwright/test';

for (const menu of [
  { path: '/poems/opening-in-sight', panel: '.tuner', handle: 'bloom tuner' },
  { path: '/clearing-song', panel: '.pipeline-dashboard', handle: 'allisinbloom.art' },
]) {
  test(`${menu.handle} moves by pointer and keyboard, reopens in place and fits a smaller screen`, async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto(menu.path, { waitUntil: 'networkidle' });
    await page.keyboard.press('`');
    const panel = page.locator(menu.panel);
    const handle = panel.getByRole('button', { name: new RegExp(`^${menu.handle}\\. Drag`) });
    await expect(handle).toBeVisible();
    const initial = (await panel.boundingBox())!;
    const grip = (await handle.boundingBox())!;
    await page.mouse.move(grip.x + 20, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x - 120, grip.y - 60, { steps: 8 });
    await page.mouse.up();
    const moved = (await panel.boundingBox())!;
    expect(moved.x).toBeLessThan(initial.x - 100);
    expect(moved.y).toBeLessThan(initial.y - 50);
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await page.keyboard.press('`');
    const reopened = (await panel.boundingBox())!;
    expect(reopened.x).toBeCloseTo(moved.x, 0);
    expect(reopened.y).toBeCloseTo(moved.y, 0);
    await handle.focus();
    const scroll = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('ArrowUp');
    const nudged = (await panel.boundingBox())!;
    expect(nudged.x).toBeCloseTo(moved.x - 10, 0);
    expect(nudged.y).toBeCloseTo(moved.y - 1, 0);
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    await expect(panel.getByRole('button', { name: /^Close / })).toHaveCount(0);
    await page.mouse.click(5, 5);
    await expect(panel).toHaveCount(0);
    await page.keyboard.press('`');
    const afterOutside = (await panel.boundingBox())!;
    expect(afterOutside.x).toBeCloseTo(nudged.x, 0);
    expect(afterOutside.y).toBeCloseTo(nudged.y, 0);
    await page.setViewportSize({ width: 320, height: 568 });
    await expect.poll(async () => {
      const box = (await panel.boundingBox())!;
      return box.x >= 11 && box.y >= 11 && box.x + box.width <= 309 && box.y + box.height <= 557;
    }).toBe(true);
  });
}

test('a touch title drag moves the tuner; expansion and field scrubbing preserve its reachable location', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/poems/opening-in-sight', { waitUntil: 'networkidle' });
  await page.keyboard.press('`');
  const panel = page.locator('.tuner');
  const handle = panel.getByRole('button', { name: /^bloom tuner\. Drag/ });
  await expect(handle).toBeVisible();
  const initial = (await panel.boundingBox())!;
  const grip = (await handle.boundingBox())!;
  const pointer = { pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 };
  await handle.dispatchEvent('pointerdown', { ...pointer, clientX: grip.x + 10, clientY: grip.y + 5 });
  await handle.dispatchEvent('pointermove', { ...pointer, clientX: grip.x + 10, clientY: grip.y - 40 });
  await handle.dispatchEvent('pointerup', { ...pointer, clientX: grip.x + 10, clientY: grip.y - 40 });
  expect((await panel.boundingBox())!.y).toBeCloseTo(initial.y - 45, 0);
  await page.getByText('shader', { exact: true }).click();
  await expect.poll(async () => (await panel.boundingBox())!.y).toBeCloseTo(12, 0);
  const before = (await panel.boundingBox())!;
  expect(before.y + before.height).toBeLessThanOrEqual(833);
  const field = panel.locator('.field').first();
  const input = field.locator('input');
  const value = await input.inputValue();
  const knob = (await field.locator('.knob').boundingBox())!;
  await page.mouse.move(knob.x + 10, knob.y + 10);
  await page.mouse.down();
  await page.mouse.move(knob.x + 25, knob.y + 10, { steps: 3 });
  await page.mouse.up();
  await expect(input).not.toHaveValue(value);
  const after = (await panel.boundingBox())!;
  expect(after.x).toBe(before.x);
  expect(after.y).toBe(before.y);
  const scrubbed = await input.inputValue();
  await input.fill('not a number');
  await input.press('Escape');
  await expect(input).toHaveValue(scrubbed);
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});
