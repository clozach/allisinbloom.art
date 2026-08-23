<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import PoemNav from '$lib/components/PoemNav.svelte';
	import BloomShader from '$lib/components/BloomShader.svelte';

	// Get routes and poem titles from layout data
	$: routes = $page.data.routes || ['opening-in-sight'];
	$: poemTitles = ($page.data.poemTitles || {}) as Record<string, string>;

	// Determine current route from URL
	$: currentRoute = getCurrentRoute($page.url.pathname);
	$: currentIndex = routes.indexOf(currentRoute);

	// Navigation state - ensure routes are loaded and currentIndex is valid
	$: validCurrentIndex = routes.length > 0 && currentIndex >= 0 ? currentIndex : 0;
	$: hasPrevious = routes.length > 1 && validCurrentIndex > 0;
	$: hasNext = routes.length > 1 && validCurrentIndex < routes.length - 1;
	$: previousSlug = hasPrevious ? routes[validCurrentIndex - 1] : null;
	$: nextSlug = hasNext ? routes[validCurrentIndex + 1] : null;
	$: previousUrl = previousSlug ? `/poems/${previousSlug}` : null;
	$: nextUrl = nextSlug ? `/poems/${nextSlug}` : null;
	$: previousTitle = previousSlug ? (poemTitles[previousSlug] || previousSlug.replace(/-/g, ' ')) : '';
	$: nextTitle = nextSlug ? (poemTitles[nextSlug] || nextSlug.replace(/-/g, ' ')) : '';

	// Check if current page is a poem (home or /poems/*)
	$: isPoemPage = $page.url.pathname === '/' || $page.url.pathname.startsWith('/poems/');

	function getCurrentRoute(pathname: string) {
		if (pathname === '/') {
			return routes && routes.length > 0 ? routes[0] : 'opening-in-sight';
		}
		const match = pathname.match(/\/poems\/([^/]+)/);
		return match ? match[1] : routes && routes.length > 0 ? routes[0] : 'opening-in-sight';
	}

	function handlePrevious() {
		if (previousUrl) goto(previousUrl);
	}

	function handleNext() {
		if (nextUrl) goto(nextUrl);
	}

	// Global keyboard navigation (ArrowLeft/Right and j/k)
	onMount(() => {
		const keyHandler = (e: KeyboardEvent) => {
			if (!isPoemPage) return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const t = e.target as HTMLElement | null;
			if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|AUDIO|VIDEO)$/.test(t.tagName)))
				return;
			if (e.key === 'ArrowLeft' || e.key === '<' || e.key === 'j' || e.key === ',') {
				handlePrevious();
			} else if (e.key === 'ArrowRight' || e.key === '>' || e.key === 'k' || e.key === '.') {
				handleNext();
			}
		};
		window.addEventListener('keydown', keyHandler);
		return () => window.removeEventListener('keydown', keyHandler);
	});
</script>

<svelte:head>
	<title>Allisin Bloom | {$page.data.title || 'A Collection of Poems and Prose'}</title>
	<meta
		name="description"
		content="A collection of poems and prose, built with mdsvex and notion."
	/>
</svelte:head>

{#if isPoemPage}
	<BloomShader slug={currentRoute} />
{/if}

<div class="app">
	<main>
		<slot />
		{#if isPoemPage}
			<PoemNav {previousUrl} {nextUrl} {previousTitle} {nextTitle} />
		{/if}
	</main>
</div>

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
</style>
