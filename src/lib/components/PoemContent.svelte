<script>
	/** @type {HTMLDivElement | undefined} */
	export let element = undefined;
	/** @type {string | null} */
	export let html = null;
	/**
	 * @typedef {Object} PoemContentProps
	 * @property {string} content - The HTML content of the poem
	 */
</script>

<div class="poem-content" bind:this={element}>
	{#if html === null}
		<slot></slot>
	{:else}
		<!-- Saved HTML is validated by the same strict allowlist on both API reads and writes. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html}
	{/if}
</div>

<style>
	.poem-content {
		line-height: 1.8;
		white-space: pre-wrap;
		padding-top: 1.2rem;
	}

	/* Stanza gaps: each markdown stanza compiles to its own <p>, and
     global.css's `* { margin: 0 }` reset would otherwise fuse them. */
	.poem-content :global(p) {
		margin: 1em 0;
		white-space: pre-wrap;
		tab-size: 8;
	}

	/* Format code blocks properly */
	.poem-content :global(pre),
	.poem-content :global(code) {
		font-family: 'Noto Serif', 'Georgia', serif;
		white-space: pre-wrap;
		background: none;
		padding: 0;
		margin: 0;
		font-size: inherit;
		line-height: inherit;
	}
</style>
