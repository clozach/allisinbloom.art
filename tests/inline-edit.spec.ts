import { test, expect } from '@playwright/test';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

test.describe('direct poem editing', () => {
	test.describe.configure({ mode: 'serial' });
	let previousFile: Buffer | null = null;
	let filename: string;
	let slug: string;
	test.beforeAll(async ({}, info) => {
		slug = info.project.name === 'iphone-webkit' ? 'wood-between-the-worlds' : 'width-test';
		filename = resolve('.poem-edits', `${slug}.json`);
		previousFile = await readFile(filename).catch(() => null);
		await unlink(filename).catch(() => {});
	});
	test.afterAll(async () => {
		if (previousFile) await writeFile(filename, previousFile, { mode: 0o600 });
		else await unlink(filename).catch(() => {});
	});

	test('save, reload, saved undo and redo retain literal text and title', async ({ page }) => {
		await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
		const before = await page.locator('.poem-content').textContent();
		await page.getByRole('button', { name: 'Edit poem' }).click();
		const body = page.getByRole('textbox', { name: 'Poem text' });
		await body.press('End');
		await page.keyboard.type(' a small revision');
		await page.keyboard.press('Enter');
		await page.keyboard.press('Tab');
		await page.keyboard.type('  with room  ');
		const edited = await body.textContent();
		expect(edited).toContain('\n\t  with room  ');
		await page.getByRole('textbox', { name: 'Poem title' }).fill('A title edited here');
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('Saved.');
		await expect(page.locator('.poem-title')).toHaveText('A title edited here');
		expect(await page.locator('.poem-content').textContent()).toBe(edited);
		await page.getByRole('button', { name: 'Undo saved edit' }).click();
		await expect.poll(() => page.locator('.poem-content').textContent()).toBe(before);
		await page.getByRole('button', { name: 'Redo saved edit' }).click();
		await expect.poll(() => page.locator('.poem-content').textContent()).toBe(edited);
		await page.reload({ waitUntil: 'networkidle' });
		expect(await page.locator('.poem-content').textContent()).toBe(edited);
		await expect(page.locator('.poem-title')).toHaveText('A title edited here');
	});

	test('cancel restores layout and body; navigation keys and backtick remain literal while editing', async ({
		page
	}) => {
		await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
		const before = await page.locator('.poem-content').innerHTML();
		await page.getByRole('button', { name: 'Edit poem' }).click();
		await page.keyboard.type('` j,k.< more words');
		await expect(page).toHaveURL(new RegExp(`${slug}$`));
		await expect(page.getByRole('region', { name: 'Publishing pipeline' })).toHaveCount(0);
		await page.getByRole('button', { name: 'Cancel', exact: true }).click();
		expect(await page.locator('.poem-content').innerHTML()).toBe(before);
		await page.keyboard.press('`');
		await expect(page.getByRole('region', { name: 'Publishing pipeline' })).toBeVisible();
	});

	test('a failed save keeps changes and retry succeeds', async ({ page }) => {
		await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Edit poem' }).click();
		await page.keyboard.type(' — still here');
		const text = await page.getByRole('textbox', { name: 'Poem text' }).textContent();
		await page.route(`**/api/poem-edits/${slug}`, async (route) => {
			if (route.request().method() === 'PUT') await route.abort();
			else await route.continue();
		});
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('Connection lost');
		expect(await page.getByRole('textbox', { name: 'Poem text' }).textContent()).toBe(text);
		await page.unroute(`**/api/poem-edits/${slug}`);
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('Saved.');
	});

	test('a competing tab cannot overwrite a newer save', async ({ page, context }) => {
		await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
		const other = await context.newPage();
		await other.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Edit poem' }).click();
		await page.keyboard.type(' FIRST TAB');
		await other.getByRole('button', { name: 'Edit poem' }).click();
		await other.keyboard.type(' SECOND TAB');
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('Saved.');
		await other.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(other.getByRole('status')).toContainText('another tab');
		await expect(other.getByRole('textbox', { name: 'Poem text' })).toContainText('SECOND TAB');
		other.on('dialog', (dialog) => dialog.accept());
		await other.getByRole('button', { name: 'Load saved version' }).click();
		await expect(other.locator('.poem-content')).toContainText('FIRST TAB');
		await expect(other.locator('.poem-content')).not.toContainText('SECOND TAB');
		await other.close();
	});

	test('rich paste inserts plain text and a mobile line break stays a literal LF', async ({
		page
	}) => {
		await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Edit poem' }).click();
		const body = page.getByRole('textbox', { name: 'Poem text' });
		const before = await body.textContent();
		await body.evaluate((element) => {
			const data = new DataTransfer();
			data.setData('text/plain', '\n\t  <script>plain words</script>\u00a0  ');
			data.setData('text/html', '<img src=x onerror="window.pasteExecuted=true">');
			element.dispatchEvent(
				new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data })
			);
			element.dispatchEvent(
				new InputEvent('beforeinput', {
					bubbles: true,
					cancelable: true,
					inputType: 'insertParagraph'
				})
			);
		});
		expect(await body.textContent()).toBe(before + '\n\t  <script>plain words</script>\u00a0  \n');
		await expect(body.locator('script,img')).toHaveCount(0);
		await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	});

	test('unconnected preview clearly keeps Save unavailable', async ({ page }) => {
		await page.route(`**/api/poem-edits/${slug}`, (route) =>
			route.fulfill({ json: { available: false, document: null, revision: null } })
		);
		await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Edit poem' }).click();
		await page.keyboard.type(' trial');
		await expect(page.getByRole('status')).toContainText('Saving isn’t connected');
		await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
		await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	});

	test('pending save freezes fields so later typing cannot be discarded', async ({ page }) => {
		await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Edit poem' }).click();
		await page.keyboard.type(' safely saved');
		const before = await page.locator('.poem-content').textContent();
		let release!: () => void;
		const hold = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route(`**/api/poem-edits/${slug}`, async (route) => {
			if (route.request().method() === 'PUT') await hold;
			await route.continue();
		});
		try {
			await page.getByRole('button', { name: 'Save', exact: true }).click();
			await expect(page.locator('.poem-content')).toHaveAttribute('contenteditable', 'false');
			await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
			expect(await page.locator('.poem-content').textContent()).toBe(before);
		} finally {
			release();
		}
		await expect(page.getByRole('status')).toContainText('Saved.');
		expect(await page.locator('.poem-content').textContent()).toBe(before);
	});

	test('entering editing during the initial load reuses one request', async ({ page }) => {
		let requests = 0;
		let release!: () => void;
		const hold = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route(`**/api/poem-edits/${slug}`, async (route) => {
			if (route.request().method() === 'GET') {
				requests++;
				await hold;
			}
			await route.continue();
		});
		await page.goto(`/poems/${slug}`, { waitUntil: 'domcontentloaded' });
		try {
			await page.getByRole('button', { name: 'Edit poem' }).click();
			expect(requests).toBe(1);
		} finally {
			release();
		}
		await expect(page.getByRole('textbox', { name: 'Poem text' })).toBeVisible();
		await page.keyboard.type(' kept after load');
		await expect(page.getByRole('textbox', { name: 'Poem text' })).toContainText('kept after load');
		expect(requests).toBe(1);
		await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	});

	test('emphasis and typing undo work without markup controls', async ({ page }) => {
		await page.goto(`/poems/${slug}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Edit poem' }).click();
		const body = page.getByRole('textbox', { name: 'Poem text' });
		const emphasis = 'i, em, [style*="font-style: italic"]';
		const existingEmphasis = await body.locator(emphasis).count();
		await body.evaluate((element) => {
			const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
			let node: Node | null;
			while ((node = walker.nextNode())) {
				if ((node.textContent || '').trim().length >= 4) {
					const range = document.createRange();
					range.setStart(node, 0);
					range.setEnd(node, 4);
					element.focus();
					const selection = window.getSelection()!;
					selection.removeAllRanges();
					selection.addRange(range);
					break;
				}
			}
		});
		await page.getByRole('button', { name: 'Italic', exact: true }).click();
		await expect(body.locator(emphasis)).toHaveCount(existingEmphasis + 1);
		await page.getByRole('button', { name: 'Undo typing' }).click();
		await expect(body.locator(emphasis)).toHaveCount(existingEmphasis);
		await page.getByRole('button', { name: 'Redo typing' }).click();
		await expect(body.locator(emphasis)).toHaveCount(existingEmphasis + 1);
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('Saved.');
		await page.reload({ waitUntil: 'networkidle' });
		await expect(page.locator('.poem-content').locator(emphasis)).toHaveCount(existingEmphasis + 1);
		await expect(page.locator('[data-poem-edit-caret]')).toHaveCount(0);
	});
});
