import { test, expect, type Page, type Locator } from '@playwright/test';

const menus = [
  { path: '/poems/opening-in-sight', panel: '.tuner' },
  { path: '/clearing-song', panel: '.pipeline-dashboard' },
];
const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

async function open(page: Page, menu: typeof menus[number]) {
  await page.goto(menu.path, { waitUntil: 'networkidle' });
  await page.keyboard.press('`');
  const panel = page.locator(menu.panel);
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-panel-resize]')).toHaveCount(8);
  const initial = (await panel.boundingBox())!;
  const title = (await panel.locator('[data-menu-move-handle]').boundingBox())!;
  await page.mouse.move(title.x + 20, title.y + title.height / 2);
  await page.mouse.down();
  await page.mouse.move(title.x + 20 + 180 - initial.x, title.y + title.height / 2 + 110 - initial.y, { steps: 5 });
  await page.mouse.up();
  return panel;
}

async function dragEdge(page: Page, panel: Locator, direction: string, dx: number, dy: number) {
  const grip = panel.locator(`[data-panel-resize="${direction}"]`);
  const box = (await grip.boundingBox())!;
  const x = direction.includes('w') ? box.x + 2 : direction.includes('e') ? box.x + box.width - 2 : box.x + box.width / 2;
  const y = direction.includes('n') ? box.y + 2 : direction.includes('s') ? box.y + box.height - 2 : box.y + box.height / 2;
  expect(await grip.evaluate((el, point) => document.elementFromPoint(point.x, point.y) === el, { x, y })).toBe(true);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}

for (const menu of menus) {
  test(`${menu.panel} resizes from every edge and corner with the opposite edges anchored`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const direction of directions) {
      const panel = await open(page, menu);
      const before = (await panel.boundingBox())!;
      const dx = direction.includes('w') ? -36 : direction.includes('e') ? 36 : 0;
      const dy = direction.includes('n') ? -28 : direction.includes('s') ? 28 : 0;
      await dragEdge(page, panel, direction, dx, dy);
      const after = (await panel.boundingBox())!;
      expect(after.width).toBeCloseTo(before.width + Math.abs(dx), 0);
      expect(after.height).toBeCloseTo(before.height + Math.abs(dy), 0);
      expect(after.x).toBeCloseTo(before.x + (direction.includes('w') ? dx : 0), 0);
      expect(after.y).toBeCloseTo(before.y + (direction.includes('n') ? dy : 0), 0);
    }
    expect(errors).toEqual([]);
  });

  test(`${menu.panel} retains requested size across reopen and a smaller viewport, with scroll-safe grips`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const panel = await open(page, menu);
    await dragEdge(page, panel, 'se', 120, 150);
    const wanted = (await panel.boundingBox())!;
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await page.keyboard.press('`');
    const reopened = (await panel.boundingBox())!;
    expect(reopened.width).toBeCloseTo(wanted.width, 0);
    expect(reopened.height).toBeCloseTo(wanted.height, 0);
    const edge = panel.locator('[data-panel-resize="e"]');
    await edge.focus();
    await expect(edge).toBeFocused();
    await page.keyboard.press('Shift+ArrowRight');
    expect((await panel.boundingBox())!.width).toBeCloseTo(wanted.width + 10, 0);
    await page.setViewportSize({ width: 390, height: 568 });
    await expect.poll(async () => {
      const box = (await panel.boundingBox())!;
      return box.x >= 11 && box.y >= 11 && box.x + box.width <= 379 && box.y + box.height <= 557;
    }).toBe(true);
    await page.keyboard.press('Escape');
    await page.keyboard.press('`');
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect.poll(async () => (await panel.boundingBox())!.width).toBeCloseTo(wanted.width + 10, 0);
    expect((await panel.boundingBox())!.height).toBeCloseTo(wanted.height, 0);
    const body = panel.locator('.tuner-body, .dashboard-body');
    const gripBefore = (await panel.locator('[data-panel-resize="se"]').boundingBox())!;
    await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
    expect((await panel.locator('[data-panel-resize="se"]').boundingBox())!).toEqual(gripBefore);
  });
}

test('natural tuner height survives reopening before its first resize; resized contents scroll below the title', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/poems/opening-in-sight', { waitUntil: 'networkidle' });
  await page.keyboard.press('`');
  const panel = page.locator('.tuner');
  const before = (await panel.boundingBox())!;
  await page.keyboard.press('Escape');
  await page.keyboard.press('`');
  await panel.getByText('shader', { exact: true }).click();
  await expect.poll(async () => (await panel.boundingBox())!.height).toBeGreaterThan(before.height + 100);
  await panel.locator('[data-panel-resize="s"]').focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press('Shift+ArrowUp');
  const titleBefore = (await panel.locator('[data-menu-move-handle]').boundingBox())!;
  const edgeBefore = (await panel.locator('[data-panel-resize="s"]').boundingBox())!;
  await panel.locator('.tuner-body').evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect((await panel.locator('[data-menu-move-handle]').boundingBox())!).toEqual(titleBefore);
  expect((await panel.locator('[data-panel-resize="s"]').boundingBox())!).toEqual(edgeBefore);
  expect(await panel.locator('.tuner-body').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
});
