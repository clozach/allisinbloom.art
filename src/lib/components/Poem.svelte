<script>
	import { tick } from 'svelte';
	import ByLine from './ByLine.svelte';
	import PoemTitle from './PoemTitle.svelte';
	import PoemContent from './PoemContent.svelte';
	import { page } from '$app/stores';

	/**
	 * Title of the poem (from front-matter).
	 * The poem body is provided via the default slot compiled by mdsvex.
	 */
	export let title = '';
	export let showTitle = true;
	export let byline = 'by';
	/** @type {HTMLDivElement | undefined} */
	let body;
	/** @type {HTMLDivElement | undefined} */
	let heading;
	/**
	 * The saved site version arrives with the page for every reader; a save in
	 * this visit replaces it, and a client-side move to another poem brings its own.
	 * @type {{title: string, html: string} | null}
	 */
	let served = $page.data.editedPoem ?? null;
	/** @type {string | null} */
	let editedHtml = served?.html ?? null;
	/** @type {string | null} */
	let editedTitle = served?.title ?? null;
	$: if ($page.data.editedPoem !== served) {
		served = $page.data.editedPoem ?? null;
		editedHtml = served?.html ?? null;
		editedTitle = served?.title ?? null;
	}
	/**
	 * The editor loads on the first ⌥⌘E and stays for the page. Nothing of it
	 * shows at rest; the chord is the only way in, and the way out again.
	 * @type {typeof import('./InlinePoemEditor.svelte').default | null}
	 */
	let Editor = null;
	/** @type {{ toggle: () => Promise<void> } | undefined} */
	let editor;
	let loadingEditor = false;
	/** @param {{title: string, html: string}} document */
	function applyDocument(document) {
		editedTitle = document.title;
		editedHtml = document.html;
	}

	/** ⌥⌘E (Ctrl+Alt+E elsewhere) enters editing, and leaves it again. @param {KeyboardEvent} event */
	async function onKeydown(event) {
		if (!$page.data.poemEditing) return;
		if (!(event.metaKey || event.ctrlKey) || !event.altKey || event.code !== 'KeyE') return;
		event.preventDefault();
		event.stopImmediatePropagation();
		if (event.repeat || loadingEditor) return;
		if (!Editor) {
			loadingEditor = true;
			try {
				Editor = (await import('./InlinePoemEditor.svelte')).default;
			} finally {
				loadingEditor = false;
			}
			await tick();
		}
		await editor?.toggle();
	}
</script>

<svelte:window on:keydown={onKeydown} />

<div class="poem">
	{#if showTitle}<PoemTitle bind:element={heading}>{editedTitle ?? title}</PoemTitle>{/if}
	<PoemContent bind:element={body} html={editedHtml}>
		<slot />
	</PoemContent>
	<ByLine label={byline} />
	{#if Editor}
		<svelte:component
			this={Editor}
			bind:this={editor}
			{body}
			{heading}
			{title}
			onApply={applyDocument}
			slug={$page.url.pathname.split('/')[2]}
		/>
	{/if}
</div>
