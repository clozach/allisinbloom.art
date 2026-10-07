<script>
	/** @type {HTMLDivElement | undefined} */
	export let element = undefined;
	/**
	 * @typedef {Object} PoemTitleProps
	 * @property {string} title - The title of the poem
	 */
</script>

<div class="poem-title" bind:this={element}><slot></slot></div>

<style>
	.poem-title {
		white-space: pre-wrap;
		font-family: 'Noto Serif Display', serif;
		font-stretch: semi-condensed;
		font-weight: bold;
	}
</style>
