<script>
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
	/** @type {string | null} */
	let editedHtml = null;
	/** @type {string | null} */
	let editedTitle = null;
	/** @param {{title: string, html: string}} document */
	function applyDocument(document) {
		editedTitle = document.title;
		editedHtml = document.html;
	}
</script>

<div class="poem">
	{#if showTitle}<PoemTitle bind:element={heading}>{editedTitle ?? title}</PoemTitle>{/if}
	<PoemContent bind:element={body} html={editedHtml}>
		<slot />
	</PoemContent>
	<ByLine label={byline} />
	{#if $page.data.canEditPoems}
		{#await import('./InlinePoemEditor.svelte') then module}
			<svelte:component
				this={module.default}
				{body}
				{heading}
				{title}
				onApply={applyDocument}
				slug={$page.url.pathname.split('/')[2]}
			/>
		{/await}
	{/if}
</div>
