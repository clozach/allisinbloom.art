<script>
	// The Net: a globe of the Internet's hubs and the branches between them, the
	// region that answered lit, its hubs and branches glowing. No explanation is
	// given. Hover, a tap or keyboard focus brings up the one offer, "Poem?". Drag or
	// the arrow keys turn the Earth (Home brings your node back); the first frame is
	// drawn on the server, so the page needs no JavaScript to show the Net.
	import { onMount } from 'svelte';
	import { nodeByCode, guessNode } from '$lib/net/nodes.js';
	import { globe, netImage, COUNTS, LICENSE, CREDITS, SIZE, CX, CY, R } from '$lib/net/globe.js';
	import { pickPoem } from '$lib/net/pick.js';

	/** @type {string | null} the node that answered this request; null when unknown */
	export let lit = null;
	/** @type {string | null} the poem the Net offers */
	export let poem = null;
	/** @type {string[]} every poem the site navigates, for a browser that must pick for itself */
	export let slugs = [];
	/** @type {string} the UTC minute the offer belongs to */
	export let minute = '';

	// the server's frame leaves out backbone hops under a degree and a half, about
	// 150 km, unless they touch the lit region: a few pixels each, and there are
	// hundreds; the live globe draws them all
	const FRAME_MIN_TERR_DEG = 1.35;
	const start = nodeByCode(lit);
	let lat = start?.lat ?? 20;
	let lon = start?.lon ?? 0;
	let revealed = false;
	// The server's frame is a picture, an <img> per theme (the page's one paint, for
	// the browser's own metrics); the live SVG takes its place once the page is running
	// and that picture has been painted, so the paint is not lost to the swap.
	let live = false;
	/** @type {HTMLElement} */
	let section;
	$: frame = live ? null : (() => { const gf = globe({ lat, lon, lit, minTerrDeg: FRAME_MIN_TERR_DEG }); return { light: netImage(gf, 'light'), dark: netImage(gf, 'dark') }; })();

	$: g = globe({ lat, lon, lit });
	$: node = nodeByCode(lit);
	$: dot = g.litDot;
	$: anchor = dot && dot.front ? dot : { x: CX, y: CY };
	$: label = node
		? `The Net: a globe of the network's branches, ${COUNTS.hubs} hubs and ${COUNTS.links} links. ${node.city} answered you; it is lit.`
		: `The Net: a globe of the network's branches, ${COUNTS.hubs} hubs and ${COUNTS.links} links.`;
	const desc = `Hub and branch data from TeleGeography's Submarine Cable Map (2021 snapshot) and the Internet Topology Zoo, ${LICENSE}; credits at ${CREDITS}.`;
	$: href = poem ? `/poems/${poem}` : '/poems';

	function recenter() {
		const n = nodeByCode(lit);
		if (!n) return;
		lat = n.lat;
		lon = n.lon;
	}

	// A browser the network could not place (the dev server) guesses from its clock.
	onMount(() => {
		// `complete` is true before a data: SVG has been decoded, so wait for the decode,
		// two frames for the paint, and a second after the page began, whichever is later.
		const shown = /** @type {HTMLImageElement | undefined} */ ([...section.querySelectorAll('img.frame')].find((i) => getComputedStyle(i).display !== 'none'));
		const painted = () =>
			requestAnimationFrame(() =>
				requestAnimationFrame(() => setTimeout(() => (live = true), Math.max(0, 1000 - performance.now())))
			);
		if (!shown) live = true;
		else {
			(shown.decode ? shown.decode() : Promise.resolve()).then(painted, painted);
			setTimeout(() => (live = true), 4000);
		}
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
		px = x0 = e.clientX;
		py = y0 = e.clientY;
		size = svg.clientWidth || 1;
		svg.setPointerCapture(e.pointerId);
	}
	let raf = 0;
	let ax = 0;
	let ay = 0;
	let x0 = 0;
	let y0 = 0;
	/** @param {PointerEvent} e */
	function move(e) {
		if (!dragging) return;
		ax += e.clientX - px;
		ay += e.clientY - py;
		px = e.clientX;
		py = e.clientY;
		if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 2) moved = true;
		if (!raf) raf = requestAnimationFrame(turn);
	}
	/** one turn per frame, however many pointer events arrived */
	function turn() {
		raf = 0;
		const k = 180 / size; // a drag across the globe turns it half way round
		lon = ((lon - ax * k + 540) % 360) - 180;
		lat = Math.max(-85, Math.min(85, lat + ay * k));
		ax = 0;
		ay = 0;
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

<section class="net" class:revealed data-lit={lit || ''} data-license={LICENSE} bind:this={section}>
	{#if frame}
		<img class="frame light" src={frame.light} width={SIZE} height={SIZE} alt={label} aria-describedby="net-credits" />
		<img class="frame dark" src={frame.dark} width={SIZE} height={SIZE} alt={label} aria-describedby="net-credits" />
	{:else}
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
		<desc>{desc}</desc>
			<circle class="limb" cx={CX} cy={CY} r={R} />
			<path class="hubs back" d={g.hubs.back} />
			<path class="arc terr" d={g.arcs.terr} />
			<path class="arc tether" d={g.arcs.tether} />
			<path class="arc sub1" d={g.arcs.sub1} />
			<path class="arc sub2" d={g.arcs.sub2} />
			<path class="arc sub3" d={g.arcs.sub3} />
			<g class="glow">
				<path class="half" d={g.glow.half} />
				<path class="full" d={g.glow.full} />
				<path class="hubs region" d={g.hubs.region} />
				{#if dot && dot.front}<circle class="halo" cx={dot.x} cy={dot.y} r="26" />{/if}
			</g>
			<path class="hubs front" d={g.hubs.front} />
			<path class="regions" d={g.regions} />
			{#if dot && dot.front}<circle class="lit" cx={dot.x} cy={dot.y} r="8" />{/if}
	</svg>
	{/if}
	<a class="ask" {href} style="left:{anchor.x / 10}%;top:{anchor.y / 10}%" on:keydown={key}>Poem?</a>
	<!-- the credit, in the markup the server sends: read by screen readers and crawlers, reached
	     without JavaScript, never shown (the Net shows no text); its link is out of the Tab order -->
	<p class="visually-hidden" id="net-credits">{desc} <a href={CREDITS} tabindex="-1">Credits</a></p>
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
	.frame {
		display: block;
		width: 100%;
		height: 100%;
	}
	.frame.dark {
		display: none;
	}
	@media (prefers-color-scheme: dark) {
		.frame.light {
			display: none;
		}
		.frame.dark {
			display: block;
		}
	}
	.limb {
		fill: none;
		stroke: var(--ink);
		stroke-opacity: 0.3;
		stroke-width: 1.5;
	}
	/* branches, by weight: one cable, a few, many; backbone hops thinner; the
	   schematic links to a region dotted. Same numbers as globe.js's STROKES. */
	.arc {
		fill: none;
		stroke: var(--ink);
		stroke-linecap: round;
	}
	.arc.sub1 {
		stroke-width: 1.2;
		stroke-opacity: 0.3;
	}
	.arc.sub2 {
		stroke-width: 1.8;
		stroke-opacity: 0.45;
	}
	.arc.sub3 {
		stroke-width: 2.6;
		stroke-opacity: 0.6;
	}
	.arc.terr {
		stroke-width: 0.9;
		stroke-opacity: 0.2;
	}
	.arc.tether {
		stroke-width: 1;
		stroke-opacity: 0.3;
		stroke-dasharray: 6 6;
	}
	.hubs {
		fill: none;
		stroke: var(--ink);
		stroke-linecap: round;
	}
	.hubs.front {
		stroke-width: 3.5;
		stroke-opacity: 0.65;
	}
	.hubs.back {
		stroke-width: 3;
		stroke-opacity: 0.1;
	}
	.regions {
		fill: none;
		stroke: var(--ink);
		stroke-linecap: round;
		stroke-width: 7;
		stroke-opacity: 0.85;
	}
	/* the answering region: its hubs and branches in the accent */
	.glow .half {
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.6;
		stroke-opacity: 0.6;
		stroke-linecap: round;
	}
	.glow .full {
		fill: none;
		stroke: var(--accent-strong);
		stroke-width: 2.2;
		stroke-opacity: 0.85;
		stroke-linecap: round;
	}
	.glow .hubs.region {
		stroke: var(--accent-strong);
		stroke-width: 4.5;
		stroke-opacity: 0.9;
	}
	.halo {
		fill: var(--accent);
		fill-opacity: 0.5;
	}
	.lit {
		fill: var(--accent-strong);
	}
	/* the service region breathes; under reduced motion it simply glows */
	.glow {
		animation: pulse 4.5s ease-in-out infinite;
	}
	/* starts at the picture's 0.8 so the swap shows no jump */
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.8;
		}
		30% {
			opacity: 1;
		}
		70% {
			opacity: 0.55;
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
