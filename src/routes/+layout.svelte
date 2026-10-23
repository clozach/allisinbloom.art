<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import BloomShader from '$lib/components/BloomShader.svelte';
	import PipelineDrawer from '$lib/components/PipelineDrawer.svelte';

	// A poem page shows its poem and, in time, the afterglow; / is the Net.
	$: isPoemPage = $page.url.pathname.startsWith('/poems/');
	$: isNet = $page.url.pathname === '/';
	$: currentRoute = $page.url.pathname.match(/\/poems\/([^/]+)/)?.[1] ?? '';
</script>

<svelte:head>
	<title>Allisin Bloom | {$page.data.title || 'A Collection of Poems and Prose'}</title>
	<meta
		name="description"
		content="A collection of poems and prose, built with mdsvex and notion."
	/>
</svelte:head>

<div class="app">
	<main class:home={isNet}>
		{#key $page.url.pathname}<slot />{/key}
	</main>
</div>

<!-- after the page in the document, so the page's own offer is the first Tab stop;
     both hotspots are fixed to the screen's corner whatever their place here -->
{#if isPoemPage}
	<BloomShader slug={currentRoute} />
{:else}
	<PipelineDrawer />
{/if}

<style>
	/* Theme tokens: light is the canonical palette, dark mirrors it warmly.
	   Both ink-on-bg pairs hold ≥ 7:1 (AAA) contrast. */
	:global(:root) {
		color-scheme: light dark;
		--bg: hsl(0 13% 98%);
		--ink: #533737;
		--accent: #caa8d6;
		--accent-strong: #b077c5;
		--hr: #eeebe2;
		--card-bg: #fff;
		--shadow: rgb(0 0 0 / 0.1);
		/* tint recipe for the signature png (see ByLine.svelte) */
		--sig-filter: invert(21%) sepia(4%) saturate(3757%) hue-rotate(314deg) brightness(98%)
			contrast(88%);
	}
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--bg: hsl(345 9% 11%);
			--ink: hsl(9 25% 86%);
			--accent: #d3b3e0;
			--accent-strong: #e2c8ee;
			--hr: #453a3e;
			--card-bg: #2b2326;
			--shadow: rgb(0 0 0 / 0.5);
			--sig-filter: invert(88%) sepia(8%) saturate(300%) hue-rotate(314deg) brightness(102%)
				contrast(90%);
		}
	}
	/* explicit override hooks ([data-theme] beats the media query); used by
	   the dev-only bloom tuner, available to any future manual theme toggle */
	:global(:root[data-theme='light']) {
		--bg: hsl(0 13% 98%);
		--ink: #533737;
		--accent: #caa8d6;
		--accent-strong: #b077c5;
		--hr: #eeebe2;
		--card-bg: #fff;
		--shadow: rgb(0 0 0 / 0.1);
		--sig-filter: invert(21%) sepia(4%) saturate(3757%) hue-rotate(314deg) brightness(98%)
			contrast(88%);
	}
	:global(:root[data-theme='dark']) {
		--bg: hsl(345 9% 11%);
		--ink: hsl(9 25% 86%);
		--accent: #d3b3e0;
		--accent-strong: #e2c8ee;
		--hr: #453a3e;
		--card-bg: #2b2326;
		--shadow: rgb(0 0 0 / 0.5);
		--sig-filter: invert(88%) sepia(8%) saturate(300%) hue-rotate(314deg) brightness(102%)
			contrast(90%);
	}

	/* Typography and theme styles */
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Noto Serif', 'Georgia', serif;
		font-size: 1.2rem;
		line-height: 1.6;
		color: var(--ink);
		background-color: var(--bg);
	}

	/* Global rule for clickable elements */
	:global(button),
	:global(input[type='submit']),
	:global(input[type='button']),
	:global(input[type='reset']),
	:global(.clickable),
	:global([role='button']) {
		cursor: pointer;
	}

	/* Decorative horizontal rules */
	:global(hr) {
		width: 30%;
		margin: 2rem auto;
		border: none;
		border-top: 2px dashed var(--hr);
	}

	/* Global link styles with decorative elements */
	:global(a) {
		text-decoration: none;
		color: inherit;
	}
	:global(a::after) {
		content: 'º';
		color: var(--accent);
		margin-left: 0.15em;
		font-size: 0.7em;
		vertical-align: super;
	}
	:global(a:hover),
	:global(a:hover::after) {
		color: var(--accent);
	}
	:global(a:active),
	:global(a:focus),
	:global(a:active::after),
	:global(a:focus::after) {
		color: var(--accent-strong);
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		margin: 0 auto;
		margin-top: 12vh;
		margin-bottom: 30vh;
		padding: 0;
		/* poem type size lives in src/routes/poems/_poem.svelte */
	}
	/* the Net fills the first screen, centred, with nothing else on the page */
	main.home {
		width: 100%;
		margin: 0;
		min-height: 100dvh;
		display: grid;
		place-items: center;
	}
</style>
