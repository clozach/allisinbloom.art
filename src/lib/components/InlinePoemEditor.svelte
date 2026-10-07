<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { createEditHistory, snapshotTree, restoreTree } from '@courselit/inline-edit';
	import {
		insertTextAtSelection,
		serializePoemElement,
		preparePoemEditing,
		finishPoemEditing,
		placePoemCaretAtEnd
	} from '$lib/poemDocument.js';

	type PoemDocument = { title: string; html: string };
	type SavedEdit = { editId: string; before: PoemDocument; after: PoemDocument };
	export let body: HTMLDivElement | undefined;
	export let heading: HTMLDivElement | undefined;
	export let title: string;
	export let slug: string;
	// eslint-disable-next-line no-unused-vars -- callback parameter is a type declaration
	export let onApply: (document: PoemDocument) => void;

	let editing = false;
	let saving = false;
	let loaded = false;
	let available = false;
	let changed = false;
	let conflict = false;
	let sourceChanged = false;
	let message = '';
	let revision: string | null = null;
	let savedTitle = title;
	let original: PoemDocument;
	let bodySnapshot: ReturnType<typeof snapshotTree>;
	let headingSnapshot: ReturnType<typeof snapshotTree> | undefined;
	let selection: Range | null = null;
	let retry: { key: string; operationId: string } | null = null;
	let loading: Promise<void> | null = null;
	let editButton: HTMLButtonElement;
	const endpoint = `/api/poem-edits/${encodeURIComponent(slug)}`;
	const history = createEditHistory<SavedEdit>(async (entry) => {
		const result = await persist(entry.before);
		if (!result) return null;
		await apply(result.document);
		message = 'Saved.';
		return { editId: result.revision, before: entry.after, after: entry.before };
	});
	let historyState = history.getSnapshot();

	function currentDocument(): PoemDocument {
		return { title: heading?.textContent ?? savedTitle, html: serializePoemElement(body!) };
	}

	async function apply(document: PoemDocument) {
		savedTitle = document.title;
		onApply(document);
		await tick();
	}

	async function loadSaved(discard = false) {
		if (
			discard &&
			changed &&
			!window.confirm('Discard your unsaved changes and load the saved poem?')
		)
			return;
		if (loading) return loading;
		loading = performLoad(discard);
		try {
			await loading;
		} finally {
			loading = null;
		}
	}

	async function performLoad(discard: boolean) {
		try {
			const response = await fetch(endpoint, { cache: 'no-store' });
			if (!response.ok) throw new Error('Could not load saved edits. Try again.');
			const result = await response.json();
			available = result.available;
			sourceChanged = !!result.sourceChanged;
			if (discard && editing) {
				restoreDraftDOM();
				finish();
			}
			if (result.document) await apply(result.document);
			revision = result.revision;
			if (discard) {
				finish();
				message = 'Loaded the saved poem.';
			}
			loaded = true;
		} catch {
			available = false;
			message = 'Could not load saved edits. Try again.';
		}
	}

	async function persist(
		document: PoemDocument
	): Promise<{ document: PoemDocument; revision: string } | null> {
		saving = true;
		if (editing)
			for (const element of [body, heading]) if (element) element.contentEditable = 'false';
		message = 'Saving…';
		const key = JSON.stringify({ document, revision });
		if (retry?.key !== key) retry = { key, operationId: crypto.randomUUID() };
		try {
			const response = await fetch(endpoint, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ document, revision, operationId: retry.operationId })
			});
			if (response.status === 409) {
				conflict = true;
				message =
					'This poem was saved in another tab. Your changes are still here. Copy any lines you want to keep, then load the saved version.';
				return null;
			}
			if (!response.ok) {
				message = 'Could not save. Your changes are still here; try again.';
				return null;
			}
			const result = await response.json();
			revision = result.revision;
			retry = null;
			conflict = false;
			return result;
		} catch {
			message = 'Connection lost. Your changes are still here; try Save again.';
			return null;
		} finally {
			saving = false;
			if (editing)
				for (const element of [body, heading]) if (element) element.contentEditable = 'true';
		}
	}

	async function begin() {
		if (!loaded) {
			await loadSaved();
			if (!loaded) return;
		}
		original = currentDocument();
		bodySnapshot = snapshotTree(body!);
		headingSnapshot = heading ? snapshotTree(heading) : undefined;
		editing = true;
		changed = false;
		message = available
			? 'Edit the words where they are. Save when you’re ready.'
			: 'Try editing here. Saving isn’t connected on this preview yet.';
		for (const element of [body, heading])
			if (element) {
				element.contentEditable = 'true';
				element.setAttribute('role', 'textbox');
				element.setAttribute('aria-label', element === body ? 'Poem text' : 'Poem title');
				element.setAttribute('aria-multiline', element === body ? 'true' : 'false');
				element.spellcheck = false;
			}
		preparePoemEditing(body!);
		await tick();
		body!.focus();
		placePoemCaretAtEnd(body!);
	}

	function finish() {
		if (body) finishPoemEditing(body);
		for (const element of [body, heading])
			if (element) {
				element.removeAttribute('contenteditable');
				element.removeAttribute('role');
				element.removeAttribute('aria-label');
				element.removeAttribute('aria-multiline');
				element.removeAttribute('spellcheck');
			}
		editing = false;
		changed = false;
		conflict = false;
		selection = null;
	}

	function restoreDraftDOM() {
		restoreTree(bodySnapshot);
		if (headingSnapshot) restoreTree(headingSnapshot);
	}

	function cancel() {
		restoreDraftDOM();
		finish();
		message = 'Changes discarded.';
		editButton?.focus();
	}

	async function save() {
		let document: PoemDocument;
		try {
			document = currentDocument();
		} catch {
			message = 'This formatting could not be saved. Undo the last change and try again.';
			return;
		}
		if (document.title === original.title && document.html === original.html) {
			finish();
			message = 'No changes to save.';
			return;
		}
		const result = await persist(document);
		if (!result) return;
		history.record({ editId: result.revision, before: original, after: result.document });
		// Restore Svelte-owned node identities before applying the saved document.
		// Native edits can replace its text nodes (especially an empty title).
		restoreDraftDOM();
		finish();
		await apply(result.document);
		message = 'Saved. Your Notion source is unchanged.';
		editButton?.focus();
	}

	function onInput() {
		changed = true;
		conflict = false;
	}
	function selectionIsInPoem() {
		const anchor = window.getSelection()?.anchorNode;
		return !!anchor && !!(body?.contains(anchor) || heading?.contains(anchor));
	}
	function targetIsInPoem(event: Event) {
		return (
			event.target instanceof Node &&
			!!(body?.contains(event.target) || heading?.contains(event.target))
		);
	}
	function format(command: string) {
		if (saving) return;
		const retained = selection?.cloneRange();
		const field = retained && heading?.contains(retained.startContainer) ? heading : body;
		field?.focus({ preventScroll: true });
		if (retained) {
			const selected = window.getSelection();
			selected?.removeAllRanges();
			selected?.addRange(retained);
		}
		if (!selectionIsInPoem()) {
			body?.focus();
			placePoemCaretAtEnd(body!);
		}
		document.execCommand(command);
		onInput();
	}
	function onKey(event: KeyboardEvent) {
		if (!editing || saving) return;
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
			event.preventDefault();
			if (available && !saving) void save();
			return;
		}
		if (!targetIsInPoem(event) || !selectionIsInPoem()) return;
		if (event.key === 'Enter' || event.key === 'Tab') {
			if (event.key === 'Tab' && event.shiftKey) return;
			// Literal characters preserve stanza spacing and indentation in both engines.
			event.preventDefault();
			if (heading?.contains(event.target as Node)) return;
			insertTextAtSelection(body!, event.key === 'Tab' ? '\t' : '\n');
			onInput();
		}
	}
	function onBeforeInput(event: InputEvent) {
		if (!editing || saving || event.isComposing || !targetIsInPoem(event) || !selectionIsInPoem())
			return;
		const target = heading?.contains(event.target as Node) ? heading : body;
		if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
			event.preventDefault();
			if (target !== heading) {
				insertTextAtSelection(target!, '\n');
				onInput();
			}
		} else if (event.inputType === 'insertText' && event.data && /\s/.test(event.data)) {
			event.preventDefault();
			insertTextAtSelection(target!, event.data);
			onInput();
		}
	}
	function onPaste(event: ClipboardEvent) {
		if (!editing || saving || !targetIsInPoem(event) || !selectionIsInPoem()) return;
		event.preventDefault();
		const target = heading?.contains(event.target as Node) ? heading : body;
		const text = event.clipboardData?.getData('text/plain') || '';
		insertTextAtSelection(target!, target === heading ? text.replace(/[\r\n]+/g, ' ') : text);
		onInput();
	}
	function preventDrop(event: DragEvent) {
		if (
			editing &&
			(body?.contains(event.target as Node) || heading?.contains(event.target as Node))
		)
			event.preventDefault();
	}
	function beforeUnload(event: BeforeUnloadEvent) {
		if (changed || saving) {
			event.preventDefault();
			event.returnValue = '';
		}
	}
	beforeNavigate(({ cancel }) => {
		if ((changed || saving) && !window.confirm('Leave without saving your poem changes?')) cancel();
	});

	onMount(() => {
		const unsubscribe = history.subscribe((value) => {
			historyState = value;
		});
		const rememberSelection = () => {
			if (editing && selectionIsInPoem())
				selection = window.getSelection()?.getRangeAt(0).cloneRange() || null;
		};
		document.addEventListener('selectionchange', rememberSelection);
		void loadSaved();
		return () => {
			unsubscribe();
			document.removeEventListener('selectionchange', rememberSelection);
		};
	});
</script>

<svelte:window
	on:keydown={onKey}
	on:beforeinput={onBeforeInput}
	on:paste={onPaste}
	on:input={(event) => {
		if (editing && targetIsInPoem(event)) onInput();
	}}
	on:drop={preventDrop}
	on:beforeunload={beforeUnload}
/>

<div class:editing class="poem-editor" aria-label="Poem editing">
	<div class="controls">
		{#if editing}
			<span class="editing-label">Editing</span>
			<button
				disabled={saving}
				aria-label="Italic"
				title="Italic"
				on:pointerdown|preventDefault={() => format('italic')}
				on:click={(e) => {
					if (e.detail === 0) format('italic');
				}}><em>I</em></button
			>
			<button
				disabled={saving}
				aria-label="Bold"
				title="Bold"
				on:pointerdown|preventDefault={() => format('bold')}
				on:click={(e) => {
					if (e.detail === 0) format('bold');
				}}><strong>B</strong></button
			>
			<button
				disabled={saving}
				aria-label="Undo typing"
				on:pointerdown|preventDefault={() => format('undo')}
				on:click={(e) => {
					if (e.detail === 0) format('undo');
				}}>↶</button
			>
			<button
				disabled={saving}
				aria-label="Redo typing"
				on:pointerdown|preventDefault={() => format('redo')}
				on:click={(e) => {
					if (e.detail === 0) format('redo');
				}}>↷</button
			>
			<span class="spacer"></span>
			<button disabled={saving} on:click={cancel}>Cancel</button>
			<button class="primary" disabled={!available || saving || !changed} on:click={save}
				>{saving ? 'Saving…' : 'Save'}</button
			>
		{:else}
			<button
				class="edit-entry"
				bind:this={editButton}
				disabled={saving || historyState.pending}
				on:click={begin}>✎ Edit poem</button
			>
			{#if historyState.undoStack.length || historyState.redoStack.length}
				<button
					disabled={!historyState.canUndo}
					aria-label="Undo saved edit"
					on:click={() => history.undo()}>↶ Undo</button
				>
				<button
					disabled={!historyState.canRedo}
					aria-label="Redo saved edit"
					on:click={() => history.redo()}>↷ Redo</button
				>
			{/if}
		{/if}
	</div>
	{#if message}<p role="status">{message}</p>{/if}
	{#if sourceChanged}<p class="source-warning">
			The imported source changed after these site edits. Your saved version is shown; review the
			source before replacing it.
		</p>{/if}
	{#if conflict}<button class="resolve" disabled={saving} on:click={() => loadSaved(true)}
			>Load saved version</button
		>{/if}
	{#if editing}<p class="hint">
			Enter adds a line · Tab indents · Shift Tab leaves · ⌘ / Ctrl S saves
		</p>{/if}
</div>

<style>
	.poem-editor {
		margin-top: 2rem;
		font:
			13px/1.5 system-ui,
			sans-serif;
		white-space: normal;
		max-width: 46rem;
	}
	.controls {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	button {
		min-height: 40px;
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--hr);
		border-radius: 6px;
		background: var(--card-bg);
		color: var(--ink);
		font: inherit;
	}
	button:hover {
		border-color: var(--accent-strong);
	}
	button:focus-visible {
		outline: 2px solid var(--accent-strong);
		outline-offset: 3px;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.primary {
		background: var(--ink);
		color: var(--bg);
	}
	.edit-entry {
		background: transparent;
	}
	p {
		margin: 0.5rem 0 0;
		max-width: 40rem;
	}
	.hint {
		opacity: 0.7;
		font-size: 11px;
	}
	.editing-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		margin-right: 0.4rem;
	}
	.editing {
		border-top: 1px solid var(--accent);
		padding-top: 0.8rem;
	}
	.spacer {
		flex: 1;
	}
	.resolve {
		margin-top: 0.5rem;
	}
	.source-warning {
		border-left: 2px solid var(--accent-strong);
		padding-left: 0.6rem;
	}
	@media (max-width: 480px) {
		.editing-label {
			display: none;
		}
	}
	:global(.poem [contenteditable='true']) {
		outline: 1px dashed var(--accent-strong);
		outline-offset: 2px;
		border-radius: 2px;
		caret-color: var(--ink);
	}
	:global(.poem [contenteditable='true']:focus) {
		outline-style: solid;
	}
</style>
