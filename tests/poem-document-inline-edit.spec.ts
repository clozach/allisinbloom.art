import { test, expect } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';

test('literal trailing lines, indentation and shared typing undo survive repeated editing', async ({
	page
}) => {
	await page.goto('/poems/width-test', { waitUntil: 'networkidle' });
	const original = await page.locator('.poem-content').innerHTML();
	await page.getByRole('button', { name: 'Edit poem' }).click();
	const body = page.getByRole('textbox', { name: 'Poem text' });
	const before = await body.textContent();

	await page.keyboard.press('Enter');
	expect(await body.textContent()).toBe(before + '\n');
	await page.getByRole('button', { name: 'Undo typing', exact: true }).click();
	await expect.poll(() => body.textContent()).toBe(before);
	await page.keyboard.press('Control+Shift+Z');
	await expect.poll(() => body.textContent()).toBe(before + '\n');
	await page.keyboard.press('Control+z');
	await expect.poll(() => body.textContent()).toBe(before);
	await page.getByRole('button', { name: 'Redo typing', exact: true }).click();
	await expect.poll(() => body.textContent()).toBe(before + '\n');

	await page.keyboard.press('Tab');
	await page.keyboard.type('  first line  ');
	await page.keyboard.press('Enter');
	await page.keyboard.type('second line');
	await page.keyboard.press('Enter');
	await page.keyboard.press('Enter');
	await page.keyboard.type('last\u00a0  ');
	expect(await body.textContent()).toBe(before + '\n\t  first line  \nsecond line\n\nlast\u00a0  ');

	await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	expect(await page.locator('.poem-content').innerHTML()).toBe(original);
	await expect(page.locator('[data-poem-edit-caret]')).toHaveCount(0);
});

test('an unchanged edit session leaves no caret helpers or layout changes', async ({ page }) => {
	await page.goto('/poems/the-world-behind-the-world-shifted', { waitUntil: 'networkidle' });
	const body = page.locator('.poem-content');
	const original = await body.innerHTML();
	const text = await body.textContent();
	await page.getByRole('button', { name: 'Edit poem' }).click();
	expect(await body.textContent()).toBe(text);
	await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	expect(await body.innerHTML()).toBe(original);
});

test('every available private poem can be edited and cancelled without changing its layout', async ({
	page
}) => {
	const directory = new URL('../src/lib/server/drafts/', import.meta.url);
	const files = existsSync(directory)
		? readdirSync(directory).filter((file) => file.endsWith('.json'))
		: [];
	test.skip(!files.length, 'Private poem sources are intentionally absent from public CI.');
	test.setTimeout(180_000);
	let editedPreformatted = false;
	let editedRich = false;
	for (const file of files) {
		await page.goto(`/poems/${encodeURIComponent(file.slice(0, -5))}`, {
			waitUntil: 'networkidle'
		});
		const body = page.locator('.poem-content');
		const original = await body.innerHTML();
		const text = await body.textContent();
		const titles = await page.locator('.poem-title').allTextContents();
		const isPreformatted = (await body.locator('.preformatted').count()) > 0;
		const isRich = (await body.locator('em').count()) > 0;
		await page.getByRole('button', { name: 'Edit poem' }).click();
		await expect(page.getByRole('textbox', { name: 'Poem text' })).toBeVisible();
		expect(await body.textContent()).toBe(text);
		if ((!editedPreformatted && isPreformatted) || (!editedRich && isRich)) {
			await page.keyboard.press('Enter');
			await page.keyboard.press('Tab');
			await page.keyboard.type('  temporary edit  ');
			expect(await body.textContent()).toBe(text + '\n\t  temporary edit  ');
			editedPreformatted ||= isPreformatted;
			editedRich ||= isRich;
		}
		await page.getByRole('button', { name: 'Cancel', exact: true }).click();
		expect(await body.innerHTML()).toBe(original);
		expect(await page.locator('.poem-title').allTextContents()).toEqual(titles);
		await expect(page.locator('[data-poem-edit-caret]')).toHaveCount(0);
	}
	expect(editedPreformatted).toBe(true);
	expect(editedRich).toBe(true);
});
