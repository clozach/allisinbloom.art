<script>
	// What a poem page offers once the poem has been given its time: nothing at
	// first; then a message, once a slow reader could have finished; then, about
	// ninety seconds later, a small picture of the day for the reader's region,
	// which fills the viewport when triggered. The reading clock runs only while
	// the page is in view; the wait runs on the wall clock, breaks included.
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { loadPace, readingTime, measureText, jitteredWait, aboutWait, recordRead } from '$lib/net/reading.js';
	import { pictureSeed, dayKey } from '$lib/net/pick.js';
	import { nodeByCode, guessNode } from '$lib/net/nodes.js';
	import { generateTune } from '$lib/bloom/generate.js';
	import { renderBloomStill } from '$lib/bloom/gl.js';
	import { describePicture } from '$lib/net/voice.js';
	import PoemNav from './PoemNav.svelte';

	/** @type {HTMLElement | undefined} the poem's words */
	export let body = undefined;
	/** @type {HTMLElement | undefined} the poem's title */
	export let heading = undefined;
	export let slug = '';
	/** @type {string | null} the node that answered this page */
	export let region = null;
	/** @type {'reading' | 'message' | 'thumb' | 'open'} */
	export let phase = 'reading';

	let pace = loadPace();
	$: about = aboutWait(pace);
	$: message = `Allisin's picture of the day for your region will be ready for you in ${about}. This is a good time for rereading or closing your eyes, staring into the moving muted colors inside, noticing the breath, asking yourself what you're still doing at the computer. It's ok if you take a break. I'd get up and test out the extremities of movement in each of your joints! Yes, even if you call the computer your "phone".`;
	$: node = nodeByCode(region);

	// the reading clock: counts only while the page is in view
	let readMs = 0;
	let readElapsed = 0;
	let readSince = 0;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let readTimer;
	// the wait: wall clock from the moment the message appears
	let messageAt = 0;
	let thumbAt = 0;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let thumbTimer;

	function textOfPoem() {
		return `${heading?.textContent || ''}\n${body?.textContent || ''}`;
	}
	function arm() {
		clearTimeout(readTimer);
		if (typeof document === 'undefined' || document.visibilityState !== 'visible' || phase !== 'reading') return;
		readSince = performance.now();
		readTimer = setTimeout(toMessage, Math.max(0, readMs - readElapsed));
	}
	function pause() {
		clearTimeout(readTimer);
		if (readSince) {
			readElapsed += performance.now() - readSince;
			readSince = 0;
		}
	}
	function toMessage() {
		if (phase !== 'reading') return;
		pause();
		phase = 'message';
		recordRead(slug, dayKey(new Date()));
		messageAt = Date.now();
		scheduleThumb();
	}
	function scheduleThumb() {
		clearTimeout(thumbTimer);
		thumbAt = messageAt + jitteredWait(pace);
		thumbTimer = setTimeout(toThumb, Math.max(0, thumbAt - Date.now()));
	}
	function toThumb() {
		if (phase !== 'message') return;
		clearTimeout(thumbTimer);
		preparePicture();
		phase = 'thumb';
	}
	function open() {
		if (phase === 'thumb') phase = 'open';
	}
	/** @type {HTMLButtonElement | undefined} */
	let thumbEl;
	async function close() {
		if (phase !== 'open') return;
		phase = 'thumb';
		await tick();
		thumbEl?.focus();
	}
	/** the next phase, for the tuner's "reveal now" and for tests */
	function jump() {
		if (phase === 'reading') toMessage();
		else if (phase === 'message') toThumb();
		else if (phase === 'thumb') open();
	}
	function onVisibility() {
		if (document.visibilityState === 'visible') {
			if (phase === 'reading') arm();
			else if (phase === 'message' && Date.now() >= thumbAt) toThumb();
		} else pause();
	}
	function onPace() {
		pace = loadPace();
		if (phase === 'reading') {
			pause();
			readMs = readingTime(measureText(textOfPoem()), pace);
			arm();
		} else if (phase === 'message') {
			scheduleThumb();
		}
	}

	// the picture: the region's bloom for the reader's own day, and its narration
	let dark = false;
	/** @type {Record<string, any> | null} */
	let tune = null;
	let description = '';
	let canvasOk = true;
	function isDark() {
		const t = document.documentElement.dataset.theme;
		if (t) return t === 'dark';
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}
	function preparePicture() {
		const day = dayKey(new Date());
		const seed = pictureSeed(region ?? 'nowhere', day);
		dark = isDark();
		tune = { ...generateTune(seed), seed };
		description = describePicture(tune, node, day, dark);
	}
	/**
	 * Draws the still into a canvas at its CSS size; redraws when the theme changes.
	 * @param {HTMLCanvasElement} canvas @param {{ width: number, height: number }} size
	 */
	function still(canvas, size) {
		let drawn = '';
		const draw = () => {
			if (!tune) return;
			dark = isDark();
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const key = `${size.width}x${size.height}@${dpr}${dark ? 'd' : 'l'}`;
			if (key === drawn) return;
			drawn = key;
			description = describePicture(tune, node, dayKey(new Date()), dark);
			canvasOk = renderBloomStill(canvas, tune, { dark, width: size.width, height: size.height, pixelRatio: dpr });
		};
		draw();
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		mql.addEventListener?.('change', draw);
		return {
			/** @param {{ width: number, height: number }} next */
			update(next) {
				size = next;
				draw();
			},
			destroy() {
				mql.removeEventListener?.('change', draw);
			}
		};
	}
	/** @param {HTMLDialogElement} dialog */
	function modal(dialog) {
		dialog.showModal();
		return {
			destroy() {
				if (dialog.open) dialog.close();
			}
		};
	}
	let vw = 0;
	let vh = 0;

	onMount(() => {
		if (!region) {
			const guess = guessNode({
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				offsetMinutes: -new Date().getTimezoneOffset()
			});
			if (guess) region = guess.code;
		}
		readMs = readingTime(measureText(textOfPoem()), pace);
		arm();
		// a way straight to a later phase, for a look at it without the wait
		const ask = $page.url.searchParams.get('afterglow');
		if (ask === 'message' || ask === 'thumb' || ask === 'open') {
			toMessage();
			if (ask !== 'message') toThumb();
			if (ask === 'open') open();
		}
		/** @param {Event} e */
		const onJump = (e) => {
			const detail = /** @type {CustomEvent} */ (e).detail;
			if (detail === 'reset') {
				phase = 'reading';
				readElapsed = 0;
				readMs = readingTime(measureText(textOfPoem()), pace);
				arm();
			} else jump();
		};
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('net-pace', onPace);
		window.addEventListener('net-afterglow', onJump);
		return () => {
			clearTimeout(readTimer);
			clearTimeout(thumbTimer);
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('net-pace', onPace);
			window.removeEventListener('net-afterglow', onJump);
		};
	});
</script>

<svelte:window bind:innerWidth={vw} bind:innerHeight={vh} />

<div class="afterglow" aria-live="polite" data-phase={phase}>
	{#if phase !== 'reading'}
		<p class="note">{message}</p>
	{/if}
	{#if phase === 'thumb' || phase === 'open'}
		<button
			class="thumb"
			class:plain={!canvasOk}
			type="button"
			aria-label="Allisin's picture of the day for {node ? node.city : 'your region'}"
			aria-describedby="afterglow-picture"
			style={tune ? `--fallback:${dark ? tune.darkLaceB : tune.lightLaceB}` : ''}
			bind:this={thumbEl}
			on:click={open}
		>
			<canvas use:still={{ width: 96, height: 72 }} width="192" height="144"></canvas>
		</button>
		<p id="afterglow-picture" class="visually-hidden">{description}</p>
	{/if}
</div>
{#if phase !== 'reading'}
	<PoemNav />
{/if}

{#if phase === 'open'}
	<!-- the picture fills the viewport; a click anywhere or Escape lets it go -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog
		class="picture"
		use:modal
		on:cancel|preventDefault={close}
		on:click={close}
		aria-labelledby="afterglow-title"
		aria-describedby="afterglow-picture-full"
		style={tune ? `--fallback:${dark ? tune.darkLaceB : tune.lightLaceB}` : ''}
	>
		<figure>
			<canvas use:still={{ width: vw, height: vh }}></canvas>
			<figcaption>
				<span id="afterglow-title" class="visually-hidden">Allisin's picture of the day for {node ? node.city : 'your region'}</span>
				<span id="afterglow-picture-full" class="visually-hidden">{description}</span>
			</figcaption>
		</figure>
	</dialog>
{/if}

<style>
	.afterglow {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 1.25rem;
	}
	.note {
		margin: 2.5rem 0 0;
		font-style: italic;
		font-size: 0.85em;
		line-height: 1.7;
		white-space: normal;
	}
	.thumb {
		display: block;
		margin: 1.5rem 0 0;
		width: 96px;
		height: 72px;
		padding: 0;
		border: 0;
		border-radius: 4px; /* it floats in whitespace, so every corner may round */
		overflow: hidden;
		background: var(--fallback, var(--accent));
		box-shadow: 0 1px 3px var(--shadow);
		transition: transform 0.2s, box-shadow 0.2s;
	}
	.thumb canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
	.thumb.plain canvas {
		display: none;
	}
	.thumb:hover {
		transform: scale(1.04);
		box-shadow: 0 3px 10px var(--shadow);
	}
	.thumb:focus-visible {
		outline: 2px solid var(--accent-strong);
		outline-offset: 4px;
	}
	.picture {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100dvh;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		background: var(--bg);
		cursor: zoom-out;
	}
	.picture:focus,
	.picture:focus-visible {
		outline: none; /* the whole viewport is the picture; a ring around it marks nothing */
	}
	.picture::backdrop {
		background: transparent;
	}
	.picture figure {
		margin: 0;
		width: 100%;
		height: 100%;
		background: var(--fallback, var(--bg)); /* a browser without WebGL gets the lace colour */
	}
	.picture canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0 0 0 0);
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
	@media (prefers-reduced-motion: reduce) {
		.thumb {
			transition: none;
		}
		.thumb:hover {
			transform: none;
		}
	}
</style>
