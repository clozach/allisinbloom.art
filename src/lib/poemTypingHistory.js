import { createEditHistory } from '@courselit/inline-edit';
import { finishPoemEditing, preparePoemEditing, placePoemCaretAtEnd } from './poemDocument.js';

const MAX_ENTRIES = 100;
const MAX_BYTES = 8 * 1024 * 1024;
const markerSelector = 'br[data-poem-edit-caret]';

/** @typedef {{path: number[], offset: number, textOffset: number}} Position */
/** @typedef {{field: 'body'|'heading', anchor: Position, focus: Position}|null} Bookmark */
/** @typedef {{body: string, heading: string|null, selection: Bookmark}} Checkpoint */
/** @typedef {{editId: string, before: Checkpoint, after: Checkpoint, bytes: number, order: number}} TypingEdit */

/** @param {Checkpoint} a @param {Checkpoint} b */
const sameContent = (a, b) => a.body === b.body && a.heading === b.heading;

/**
 * Bounded in-memory typing history using the shared saved-edit journal engine.
 * The read/write adapter keeps it independently testable without a simulated
 * browser or a second undo implementation. Selection alone is not an edit.
 * @param {{read: () => Checkpoint, write: (checkpoint: Checkpoint) => void, onChange?: () => void, maxEntries?: number, maxBytes?: number}} options
 */
export function createTypingJournal({
	read,
	write,
	onChange = () => {},
	maxEntries = MAX_ENTRIES,
	maxBytes = MAX_BYTES
}) {
	const entryLimit = Math.max(1, Math.min(MAX_ENTRIES, maxEntries));
	const byteLimit = Math.max(1, Math.min(MAX_BYTES, maxBytes));
	let checkpoint = read();
	let sequence = 0;
	let restoring = false;
	let disposed = false;
	const notify = () => {
		// View errors must not strand an already applied undo outside its journal.
		try {
			onChange();
		} catch (error) {
			queueMicrotask(() => {
				throw error;
			});
		}
	};
	const history = createEditHistory(
		/** @param {TypingEdit} entry */ async (entry) => {
			if (disposed) return null;
			restoring = true;
			try {
				write(entry.before);
				checkpoint = read();
				notify();
				return { ...entry, editId: `typing-${++sequence}`, before: entry.after, after: checkpoint };
			} finally {
				restoring = false;
			}
		}
	);

	function boundHistory() {
		const snapshot = history.getSnapshot();
		const entries = [...snapshot.undoStack, ...snapshot.redoStack].sort(
			(a, b) => a.order - b.order
		);
		let bytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
		const forgotten = new Set();
		while (entries.length > entryLimit || bytes > byteLimit) {
			const first = entries.shift();
			if (!first) break;
			bytes -= first.bytes;
			forgotten.add(first.editId);
		}
		if (forgotten.size) history.forget((entry) => forgotten.has(entry.editId));
	}

	function captureBefore() {
		if (disposed || restoring || history.getSnapshot().pending) return;
		checkpoint.selection = read().selection;
	}

	function record() {
		if (disposed || restoring || history.getSnapshot().pending) return false;
		const next = read();
		if (sameContent(checkpoint, next)) {
			// insertHTML can emit input before its final caret correction. Keep the
			// same after-checkpoint object so a duplicate record refreshes the redo
			// bookmark without adding a step or clearing the redo branch.
			checkpoint.selection = next.selection;
			return false;
		}
		const before = checkpoint;
		checkpoint = next;
		const order = ++sequence;
		history.record({
			editId: `typing-${order}`,
			order,
			before,
			after: next,
			// UTF-16 storage estimate, including bookmarks. Shared snapshots may use
			// less memory; the conservative bound never retains an unbounded journal.
			bytes:
				2 *
				(before.body.length +
					next.body.length +
					(before.heading?.length || 0) +
					(next.heading?.length || 0) +
					JSON.stringify([before.selection, next.selection]).length)
		});
		boundHistory();
		notify();
		return true;
	}

	return {
		captureBefore,
		record,
		getSnapshot: history.getSnapshot,
		subscribe: history.subscribe,
		async undo() {
			if (disposed || restoring || history.getSnapshot().pending) return null;
			record();
			return history.undo();
		},
		async redo() {
			if (disposed || restoring || history.getSnapshot().pending) return null;
			record();
			return history.redo();
		},
		dispose() {
			disposed = true;
			history.forget(() => true);
			checkpoint = { body: '', heading: null, selection: null };
		}
	};
}

/** @param {Node} node */
const isMarker = (node) =>
	node.nodeType === 1 && /** @type {Element} */ (node).matches(markerSelector);
/** @param {Node} node */
const children = (node) => [...node.childNodes].filter((child) => !isMarker(child));

/** @param {HTMLElement} root @param {Node} node @param {number} offset @returns {Position} */
function position(root, node, offset) {
	const prefix = root.ownerDocument.createRange();
	prefix.selectNodeContents(root);
	prefix.setEnd(node, offset);
	const textOffset = prefix.toString().length;
	const path = [];
	let current = node;
	while (current !== root) {
		const parent = current.parentNode;
		if (!parent) break;
		path.unshift(children(parent).indexOf(/** @type {ChildNode} */ (current)));
		current = parent;
	}
	const normalizedOffset =
		node.nodeType === 3
			? offset
			: [...node.childNodes].slice(0, offset).filter((child) => !isMarker(child)).length;
	return { path, offset: normalizedOffset, textOffset };
}

/** @param {HTMLElement} root @param {Position} saved @returns {{node: Node, offset: number}} */
function resolvePosition(root, saved) {
	/** @type {Node} */
	let node = root;
	let valid = true;
	for (const index of saved.path) {
		const child = children(node)[index];
		if (!child) {
			valid = false;
			break;
		}
		node = child;
	}
	if (valid) {
		if (node.nodeType === 3 && saved.offset <= (node.textContent?.length || 0))
			return { node, offset: saved.offset };
		if (node.nodeType !== 3 && saved.offset <= children(node).length) {
			const before = children(node)[saved.offset];
			const offset = before
				? [...node.childNodes].indexOf(before)
				: [...node.childNodes].findIndex(isMarker);
			return { node, offset: offset < 0 ? node.childNodes.length : offset };
		}
	}
	// innerHTML merges adjacent text nodes. Fall back to the same literal text
	// offset instead of moving the caret to an unrelated node or losing a range.
	const walker = root.ownerDocument.createTreeWalker(root, 4 /* SHOW_TEXT */);
	let remaining = saved.textOffset;
	let text;
	while ((text = walker.nextNode())) {
		const length = text.textContent?.length || 0;
		if (remaining <= length) return { node: text, offset: remaining };
		remaining -= length;
	}
	return { node: root, offset: root.childNodes.length };
}

/** @param {HTMLElement} body @param {HTMLElement|undefined} heading @returns {Bookmark} */
function bookmark(body, heading) {
	const selection = body.ownerDocument.getSelection();
	if (!selection?.anchorNode || !selection.focusNode) return null;
	const field = heading?.contains(selection.anchorNode) ? 'heading' : 'body';
	const root = field === 'heading' ? heading : body;
	if (!root?.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;
	return {
		field,
		anchor: position(root, selection.anchorNode, selection.anchorOffset),
		focus: position(root, selection.focusNode, selection.focusOffset)
	};
}

/** @param {HTMLElement} body @param {HTMLElement|undefined} heading @param {Bookmark} saved */
function restoreBookmark(body, heading, saved) {
	const root = saved?.field === 'heading' && heading ? heading : body;
	root.focus({ preventScroll: true });
	if (!saved) {
		placePoemCaretAtEnd(root);
		return;
	}
	try {
		const anchor = resolvePosition(root, saved.anchor);
		const focus = resolvePosition(root, saved.focus);
		const selection = root.ownerDocument.getSelection();
		selection?.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
	} catch {
		placePoemCaretAtEnd(root);
	}
}

/** @param {HTMLElement} root */
function content(root) {
	const clone = /** @type {HTMLElement} */ (root.cloneNode(true));
	finishPoemEditing(clone);
	return clone.innerHTML;
}

/**
 * Call after preparing/focusing an inline edit session. This owns typing undo
 * for that entire session; callers must route keyboard and toolbar undo here,
 * never mix it with stale native undo after HTML restoration. Original Svelte
 * node snapshots remain the caller's separate Cancel/Save reconciliation data.
 * @param {{body: HTMLElement, heading?: HTMLElement, onChange?: () => void}} options
 */
export function createPoemTypingHistory({ body, heading, onChange }) {
	return createTypingJournal({
		read: () => ({
			body: content(body),
			heading: heading ? content(heading) : null,
			selection: bookmark(body, heading)
		}),
		write: (checkpoint) => {
			body.innerHTML = checkpoint.body;
			if (heading && checkpoint.heading !== null) heading.innerHTML = checkpoint.heading;
			preparePoemEditing(body);
			restoreBookmark(body, heading, checkpoint.selection);
		},
		onChange
	});
}
