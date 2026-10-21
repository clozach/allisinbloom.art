<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { createEditHistory, snapshotTree, restoreTree } from '@courselit/inline-edit';
	import { createPoemTypingHistory } from '$lib/poemTypingHistory.js';
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
	let typing: ReturnType<typeof createPoemTypingHistory> | null = null;
	let unsubscribeTyping: (() => void) | undefined;
	let typingState = { canUndo: false, canRedo: false };
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
			if (response.status === 401) return; // the sign-in prompt was declined: stay out, say nothing
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

	/** ⌥⌘E: enter editing, or leave it, saving what changed. The poem page owns the chord. */
	export async function toggle() {
		if (saving || loading) return;
		if (!editing) {
			await begin();
			return;
		}
		if (!changed) {
			finish();
			message = '';
			return;
		}
		if (!available) {
			restoreDraftDOM();
			finish();
			message = 'Not saved: saving isn’t connected here.';
			return;
		}
		await save(true);
	}

	async function begin() {
		if (!loaded) {
			await loadSaved();
			if (!loaded) return;
		}
		original = currentDocument();
		bodySnapshot = snapshotTree(body!);
		headingSnapshot = heading ? snapshotTree(heading) : undefined;
		changed = false;
		message = available ? '' : 'Saving isn’t connected here; what you type stays only until you leave.';
		// The words become editable, focused and carrying the caret in one step, so the
		// first keystroke after the chord lands in the poem.
		for (const element of [body, heading])
			if (element) {
				element.contentEditable = 'true';
				element.setAttribute('role', 'textbox');
				element.setAttribute('aria-label', element === body ? 'Poem text' : 'Poem title');
				element.setAttribute('aria-multiline', element === body ? 'true' : 'false');
				element.spellcheck = false;
			}
		preparePoemEditing(body!);
		body!.focus();
		placePoemCaretAtEnd(body!);
		typing = createPoemTypingHistory({
			body: body!,
			heading,
			onChange: () => {
				changed = true;
			}
		});
		unsubscribeTyping = typing.subscribe((state) => {
			typingState = state;
		});
		editing = true;
		await tick();
	}

	function finish() {
		unsubscribeTyping?.();
		typing?.dispose();
		typing = null;
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
	}

	/** @param quiet true when leaving by ⌥⌘E: a success shows nothing, a failure keeps editing open and says why. */
	async function save(quiet = false) {
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
		message = quiet ? '' : 'Saved. Your Notion source is unchanged.';
	}

	function onInput() {
		changed = true;
		conflict = false;
		typing?.record();
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
		if (command === 'undo') {
			void typing?.undo();
			return;
		}
		if (command === 'redo') {
			void typing?.redo();
			return;
		}
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
		typing?.captureBefore();
		document.execCommand(command);
		onInput();
	}
	function onKey(event: KeyboardEvent) {
		const chord = (event.metaKey || event.ctrlKey) && !event.altKey;
		const key = event.key.toLowerCase();
		if (!editing) {
			// After leaving, ⌘Z and ⇧⌘Z reverse the saved edits of this visit.
			if (
				chord &&
				key === 'z' &&
				!historyState.pending &&
				(historyState.undoStack.length || historyState.redoStack.length)
			) {
				event.preventDefault();
				if (event.shiftKey) {
					if (historyState.canRedo) void history.redo();
				} else if (historyState.canUndo) void history.undo();
			}
			return;
		}
		if (saving) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
			return;
		}
		if (chord && targetIsInPoem(event) && (key === 'b' || key === 'i')) {
			event.preventDefault();
			format(key === 'b' ? 'bold' : 'italic');
			return;
		}
		if (
			(event.metaKey || event.ctrlKey) &&
			targetIsInPoem(event) &&
			['z', 'y'].includes(event.key.toLowerCase())
		) {
			event.preventDefault();
			if (event.key.toLowerCase() === 'y' || event.shiftKey) void typing?.redo();
			else void typing?.undo();
			return;
		}
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
			event.preventDefault();
			if (available && !saving) void save();
			return;
		}
		if (!targetIsInPoem(event) || !selectionIsInPoem()) return;
		typing?.captureBefore();
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
		if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
			event.preventDefault();
			if (event.inputType === 'historyUndo') void typing?.undo();
			else void typing?.redo();
			return;
		}
		typing?.captureBefore();
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
		typing?.captureBefore();
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
		// Nothing loads until the chord asks: begin() fetches on demand.
		return () => {
			unsubscribe();
			unsubscribeTyping?.();
			typing?.dispose();
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

<div class="poem-editor" aria-label="Poem editing">
	<p role="status" class:shown={!!message}>{message}</p>
	{#if sourceChanged}<p class="source-warning">
			The imported source changed after these site edits. Your saved version is shown; review the
			source before replacing it.
		</p>{/if}
	{#if conflict}<button class="resolve" disabled={saving} on:click={() => loadSaved(true)}
			>Load saved version</button
		>{/if}
</div>

<style>
	.poem-editor {
		font:
			13px/1.5 system-ui,
			sans-serif;
		white-space: normal;
		max-width: 46rem;
	}
	p {
		margin: 0;
		max-width: 40rem;
	}
	p.shown,
	.source-warning,
	.resolve {
		margin-top: 1rem;
	}
	.resolve {
		min-height: 40px;
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--hr);
		border-radius: 6px;
		background: var(--card-bg);
		color: var(--ink);
		font: inherit;
	}
	.resolve:hover {
		border-color: var(--accent-strong);
	}
	.resolve:focus-visible {
		outline: 2px solid var(--accent-strong);
		outline-offset: 3px;
	}
	.resolve:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.source-warning {
		border-left: 2px solid var(--accent-strong);
		padding-left: 0.6rem;
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
