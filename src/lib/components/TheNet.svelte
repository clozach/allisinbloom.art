<script>
	// The Net: a wire-frame Earth with the network's nodes, the one that answered
	// lit, its service region glowing. No explanation is given. Hover, a tap or
	// keyboard focus brings up the one offer, "Poem?". Drag or the arrow keys turn
	// the Earth (Home brings your node back); the first frame is drawn on the
	// server, so the page needs no JavaScript to show the Net.
	import { onMount } from 'svelte';
	import { NODES, nodeByCode, guessNode } from '$lib/net/nodes.js';
	import { globe, netImage, SIZE, CX, CY, R } from '$lib/net/globe.js';
	import { pickPoem } from '$lib/net/pick.js';

	/** @type {string | null} the node that answered this request; null when unknown */
	export let lit = null;
	/** @type {string | null} the poem the Net offers */
	export let poem = null;
	/** @type {string[]} every poem the site navigates, for a browser that must pick for itself */
	export let slugs = [];
	/** @type {string} the UTC minute the offer belongs to */
	export let minute = '';

	const STEP = 15;
	const start = nodeByCode(lit);
	let lat = start?.lat ?? 20;
	let lon = start?.lon ?? 0;
	let revealed = false;
	// The server's frame is a picture inside the SVG (the page's one paint, for the
	// browser's own metrics); the live paths take its place once the page is running.
	let live = false;
	$: frame = live ? null : { light: netImage(g, 'light', lit), dark: netImage(g, 'dark', lit) };

	$: g = globe({ lat, lon, step: STEP, lit });
	$: node = nodeByCode(lit);
	$: dot = node ? g.nodes.find((n) => n.code === lit) : undefined;
	$: anchor = dot && dot.front ? dot : { x: CX, y: CY };
	$: label = node
		? `The Net: a wire globe with ${NODES.length} network nodes. ${node.city} answered you; it is lit.`
		: `The Net: a wire globe with ${NODES.length} network nodes.`;
	$: href = poem ? `/poems/${poem}` : '/poems';

	function recenter() {
		const n = nodeByCode(lit);
		if (!n) return;
		lat = n.lat;
		lon = n.lon;
	}

	// A browser the network could not place (the dev server) guesses from its clock.
	onMount(() => {
		live = true;
		if (lit) return;
		const guess = guessNode({
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			offsetMinutes: -new Date().getTimezoneOffset()
		});
		if (!guess) return;
		lit = guess.code;
		poem = pickPoem(slugs, lit, minute) ?? poem;
		recenter();
	});

	/** @type {SVGSVGElement} */
	let svg;
	let dragging = false;
	let moved = false;
	let px = 0;
	let py = 0;
	let size = 1;
	/** @param {PointerEvent} e */
	function down(e) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		dragging = true;
		moved = false;
		px = e.clientX;
		py = e.clientY;
		size = svg.clientWidth || 1;
		svg.setPointerCapture(e.pointerId);
	}
	/** @param {PointerEvent} e */
	function move(e) {
		if (!dragging) return;
		const dx = e.clientX - px;
		const dy = e.clientY - py;
		px = e.clientX;
		py = e.clientY;
		if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
		const k = 180 / size; // a drag across the globe turns it half way round
		lon = ((lon - dx * k + 540) % 360) - 180;
		lat = Math.max(-85, Math.min(85, lat + dy * k));
	}
	/** @param {PointerEvent} e */
	function up(e) {
		if (!dragging) return;
		dragging = false;
		if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
		if (!moved) revealed = true; // a tap, where there is no hover
	}
	/** @param {KeyboardEvent} e */
	function key(e) {
		const s = e.shiftKey ? 15 : 5;
		if (e.key === 'ArrowLeft') lon -= s;
		else if (e.key === 'ArrowRight') lon += s;
		else if (e.key === 'ArrowUp') lat = Math.min(85, lat + s);
		else if (e.key === 'ArrowDown') lat = Math.max(-85, lat - s);
		else if (e.key === 'Home') recenter();
		else return;
		e.preventDefault();
	}
</script>

<section class="net" class:revealed data-lit={lit || ''}>
	<!-- the drag is a pointer extra; the keyboard turns the Earth from the link below -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		bind:this={svg}
		viewBox="0 0 {SIZE} {SIZE}"
		role="img"
		aria-label={label}
		on:pointerdown={down}
		on:pointermove={move}
		on:pointerup={up}
		on:pointercancel={up}
	>
		{#if frame}
			<image class="frame light" href={frame.light} width={SIZE} height={SIZE} />
			<image class="frame dark" href={frame.dark} width={SIZE} height={SIZE} />
		{:else}
			<circle class="limb" cx={CX} cy={CY} r={R} />
			<path class="back" d={g.back} />
			<g class="glow">
				{#if g.cells}<path class="cells" d={g.cells} />{/if}
				{#if dot && dot.front}<circle class="halo" cx={dot.x} cy={dot.y} r="28" />{/if}
			</g>
			<path class="front" d={g.front} />
			<path class="dots" d={g.dots} />
			{#each g.nodes as n (n.code)}
				{#if n.code !== lit}<circle class="node" class:behind={!n.front} cx={n.x} cy={n.y} r="5" />{/if}
			{/each}
			{#if dot && dot.front}<circle class="lit" cx={dot.x} cy={dot.y} r="8" />{/if}
		{/if}
	</svg>
	<a class="ask" {href} style="left:{anchor.x / 10}%;top:{anchor.y / 10}%" on:keydown={key}>Poem?</a>
</section>

<style>
	.net {
		position: relative;
		width: min(92vw, 78vh);
		aspect-ratio: 1;
		margin: 0 auto;
	}
	svg {
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
		cursor: grab;
		user-select: none;
		-webkit-user-select: none;
	}
	svg:active {
		cursor: grabbing;
	}
	/* the server's frame: one picture per theme, the other kept out of the paint */
	.frame.dark {
		display: none;
	}
	@media (prefers-color-scheme: dark) {
		.frame.light {
			display: none;
		}
		.frame.dark {
			display: inline;
		}
	}
	.limb {
		fill: none;
		stroke: var(--ink);
		stroke-opacity: 0.3;
		stroke-width: 1.5;
	}
	.back {
		fill: none;
		stroke: var(--ink);
		stroke-opacity: 0.09;
		stroke-width: 1;
	}
	.front {
		fill: none;
		stroke: var(--ink);
		stroke-opacity: 0.38;
		stroke-width: 1.2;
	}
	.dots {
		fill: none;
		stroke: var(--ink);
		stroke-opacity: 0.55;
		stroke-width: 4;
		stroke-linecap: round;
	}
	.node {
		fill: var(--ink);
		fill-opacity: 0.8;
	}
	.node.behind {
		fill-opacity: 0.12;
	}
	.cells {
		fill: var(--accent);
		fill-opacity: 0.3;
		stroke: var(--accent);
		stroke-opacity: 0.3;
		stroke-width: 0.6; /* closes the hairline seams between cells */
	}
	.halo {
		fill: var(--accent);
		fill-opacity: 0.55;
	}
	.lit {
		fill: var(--accent-strong);
	}
	/* the service region breathes; under reduced motion it simply glows */
	.glow {
		animation: pulse 4.5s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.55;
		}
		50% {
			opacity: 1;
		}
	}
	.ask {
		position: absolute;
		transform: translate(-50%, calc(-100% - 1.25rem));
		font-style: italic;
		white-space: nowrap;
		color: var(--ink);
		opacity: 0;
		transition: opacity 0.6s;
	}
	.ask::after {
		content: none;
	}
	.net:hover .ask,
	.net.revealed .ask,
	.ask:focus-visible {
		opacity: 1;
	}
	.ask:hover,
	.ask:focus-visible {
		color: var(--ink);
	}
	.ask:focus-visible {
		outline: 2px solid var(--accent-strong);
		outline-offset: 4px;
		border-radius: 4px;
	}
	@media (prefers-reduced-motion: reduce) {
		.glow {
			animation: none;
			opacity: 0.8;
		}
		.ask {
			transition: none;
		}
	}
	@media print {
		.glow {
			animation: none;
			opacity: 0.8;
		}
		.ask {
			opacity: 1;
		}
	}
</style>
