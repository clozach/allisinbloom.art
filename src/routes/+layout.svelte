<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// Check if we're on the home page
	$: isHomePage = $page.url.pathname === '/';

	// Get routes from layout data
	$: routes = $page.data.routes || ['opening-in-sight'];

	// Determine current route from URL
	$: currentRoute = getCurrentRoute($page.url.pathname);
	$: currentIndex = routes.indexOf(currentRoute);

	// Navigation state - ensure routes are loaded and currentIndex is valid
	$: validCurrentIndex = routes.length > 0 && currentIndex >= 0 ? currentIndex : 0;
	$: hasPrevious = routes.length > 1 && validCurrentIndex > 0;
	$: hasNext = routes.length > 1 && validCurrentIndex < routes.length - 1;
	$: previousUrl = hasPrevious
		? validCurrentIndex === 1
			? '/'
			: `/poems/${routes[validCurrentIndex - 1]}`
		: null;
	$: nextUrl = hasNext ? `/poems/${routes[validCurrentIndex + 1]}` : null;

	function getCurrentRoute(pathname: string) {
		if (pathname === '/') {
			return routes && routes.length > 0 ? routes[0] : 'opening-in-sight';
		}
		const match = pathname.match(/\/poems\/([^/]+)/);
		return match ? match[1] : routes && routes.length > 0 ? routes[0] : 'opening-in-sight';
	}

	function handlePrevious() {
		if (!hasPrevious) return;
		if (previousUrl) {
			goto(previousUrl);
		}
	}

	function handleNext() {
		if (!hasNext) return;
		if (nextUrl) {
			goto(nextUrl);
		}
	}

	// Global keyboard navigation (ArrowLeft/Right and j/k)
	onMount(() => {
		const keyHandler = (e: KeyboardEvent) => {
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

<div class="app">
	<main>
		<slot />
	</main>
</div>

<style>
	/* Typography and theme styles */
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Noto Serif', 'Georgia', serif;
		font-size: 1.2rem;
		line-height: 1.6;
		color: #533737;
		background-color: hsl(0 13% 98% / 1);
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
		border-top: 2px dashed #eeebe2;
	}

	/* Global link styles with decorative elements */
	:global(a) {
		text-decoration: none;
		color: inherit;
	}
	:global(a::after) {
		content: 'º';
		color: #caa8d6;
		margin-left: 0.15em;
		font-size: 0.7em;
		vertical-align: super;
	}
	:global(a:hover),
	:global(a:hover::after) {
		color: #caa8d6;
	}
	:global(a:active),
	:global(a:focus),
	:global(a:active::after),
	:global(a:focus::after) {
		color: #b077c5;
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
		font-size: clamp(
			0.09rem,
			calc(0.09rem + (1.5rem - 0.09rem) * ((100vw - 50px) / (568px - 50px))),
			1.5rem
		);
	}
</style>
