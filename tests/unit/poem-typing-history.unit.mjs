import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTypingJournal } from '../../src/lib/poemTypingHistory.js';

function fixture(options = {}) {
	let current = {
		body: '<p>one\n\t  two\u00a0  </p><!--svelte-->',
		heading: 'A title',
		selection: null
	};
	let changes = 0;
	const history = createTypingJournal({
		read: () => ({ ...current }),
		write: (value) => {
			current = { ...value };
		},
		onChange: () => {
			changes++;
		},
		...options
	});
	return {
		history,
		get: () => current,
		set: (value) => {
			current = { ...current, ...value };
		},
		changes: () => changes
	};
}

test('typing journal preserves exact text, formatting attributes, comments and title through undo/redo', async () => {
	const f = fixture();
	const original = f.get();
	f.history.captureBefore();
	f.set({
		body: '<p style="font-style: italic">one\n\t  two\u00a0  \n\n</p><!--svelte-->',
		heading: '  New title  '
	});
	const edited = f.get();
	assert.equal(f.history.record(), true);
	assert.equal(f.history.record(), false);
	assert.equal(f.history.getSnapshot().undoStack.length, 1);
	await f.history.undo();
	assert.deepEqual(f.get(), original);
	await f.history.redo();
	assert.deepEqual(f.get(), edited);
	assert.equal(f.changes(), 3);
});

test('selection capture updates the before bookmark without creating a text edit', async () => {
	const f = fixture();
	const selection = {
		field: 'body',
		anchor: { path: [0, 0], offset: 1, textOffset: 1 },
		focus: { path: [0, 0], offset: 3, textOffset: 3 }
	};
	f.set({ selection });
	f.history.captureBefore();
	assert.equal(f.history.getSnapshot().canUndo, false);
	f.set({ body: '<p>o<em>ne</em></p>', selection: null });
	f.history.record();
	await f.history.undo();
	assert.deepEqual(f.get().selection, selection);
});

test('new typing after undo drops the redo branch, and duplicate inputs do not erase redo', async () => {
	const f = fixture();
	f.set({ body: 'one' });
	f.history.record();
	f.set({ body: 'two' });
	f.history.record();
	await f.history.undo();
	f.history.record();
	assert.equal(f.history.getSnapshot().canRedo, true);
	f.set({ body: 'different' });
	f.history.record();
	assert.equal(f.history.getSnapshot().canRedo, false);
	await f.history.undo();
	assert.equal(f.get().body, 'one');
});

test('a duplicate input refreshes the final redo caret without adding an edit', async () => {
	const f = fixture();
	f.set({ body: '<p>one\n</p>' });
	f.history.record();
	const selection = {
		field: 'body',
		anchor: { path: [0, 0], offset: 4, textOffset: 4 },
		focus: { path: [0, 0], offset: 4, textOffset: 4 }
	};
	f.set({ selection });
	assert.equal(f.history.record(), false);
	assert.equal(f.history.getSnapshot().undoStack.length, 1);
	await f.history.undo();
	await f.history.redo();
	assert.deepEqual(f.get().selection, selection);
});

test('bounded history drops oldest entries and rejects oversized retention without losing live edits', async () => {
	const f = fixture({ maxEntries: 2, maxBytes: 1000 });
	for (const body of ['a', 'b', 'c']) {
		f.set({ body });
		f.history.record();
	}
	assert.equal(f.history.getSnapshot().undoStack.length, 2);
	await f.history.undo();
	await f.history.undo();
	assert.equal(f.get().body, 'a');
	assert.equal(f.history.getSnapshot().canUndo, false);
	f.set({ body: 'x'.repeat(1000) });
	f.history.record();
	assert.equal(f.history.getSnapshot().undoStack.length, 0);
	assert.equal(f.get().body.length, 1000);
});

test('restoration suppresses input recording and disposal releases both journals', async () => {
	let current = { body: 'before', heading: null, selection: null };
	let history;
	history = createTypingJournal({
		read: () => ({ ...current }),
		write: (value) => {
			current = value;
			history.record();
		}
	});
	current = { ...current, body: 'after' };
	history.record();
	await history.undo();
	assert.equal(history.getSnapshot().undoStack.length, 0);
	assert.equal(history.getSnapshot().redoStack.length, 1);
	history.dispose();
	assert.equal(history.getSnapshot().redoStack.length, 0);
	assert.equal(history.record(), false);
	assert.equal(await history.redo(), null);
});

test('a failed restoration keeps its history entry available for retry', async () => {
	let current = { body: 'before', heading: null, selection: null };
	let fail = true;
	const history = createTypingJournal({
		read: () => ({ ...current }),
		write: (value) => {
			if (fail) throw new Error('restore failed');
			current = value;
		}
	});
	current = { ...current, body: 'after' };
	history.record();
	await assert.rejects(history.undo(), /restore failed/);
	assert.equal(history.getSnapshot().canUndo, true);
	assert.equal(current.body, 'after');
	fail = false;
	await history.undo();
	assert.equal(current.body, 'before');
});
