<script>
	export let label = 'by';
	// The signature at three widths (1x desktop, 2x and Lighthouse's 1.75x
	// phone, 3x phones), made from static/artist-sig.png by `just sig`.
	// ?no-inline keeps Vite from pasting the small file into every page.
	import s160 from '$lib/assets/artist-sig-160.webp?no-inline';
	import s288 from '$lib/assets/artist-sig-288.webp?no-inline';
	import s432 from '$lib/assets/artist-sig-432.webp?no-inline';
	import fallback from '$lib/assets/artist-sig-288.png?no-inline';
	import { page } from '$app/stores';
	// The signature is the site's home link: the first poem in static/route.txt
	// (never `/`, which redirects to a random poem). Unnamed on the page — the
	// tooltip and the accessible name carry the word.
	$: homeHref = `/poems/${($page.data.routes || ['opening-in-sight'])[0]}`;
</script>

<span class="author"
	><span class="by">{label}</span><a
		class="sig-link"
		href={homeHref}
		title="home"
		aria-label="home — the first poem"
		data-sveltekit-preload-data="hover"
		><picture
			><source
				type="image/webp"
				srcset="{s160} 160w, {s288} 288w, {s432} 432w"
				sizes="(min-width: 36rem) 9rem, 25vw"
			/><img class="sig" src={fallback} width="288" height="66" alt="Allisin Bloom" /></picture
		></a
	></span
>

<style>
	.author {
		display: inline-flex;
		align-items: baseline;
		gap: clamp(0.1em, 2vw, 0.5rem);
		font-family: 'Noto Sans', sans-serif;
		font-weight: 100;
		padding-top: 3rem;
	}

	.by {
		line-height: 1;
		font-size: clamp(
			0.09rem,
			calc(0.09rem + (1.5rem - 0.09rem) * ((100vw - 50px) / (568px - 50px))),
			1.5rem
		);
	}

	/* the signature is a link, but an unmarked one: no º suffix, no colour
	   change (the image is tinted by --sig-filter), just the pointer + tooltip */
	.sig-link {
		display: inline-block;
		line-height: 0;
	}
	.sig-link::after {
		content: none;
	}
	.sig-link:focus-visible {
		outline: 2px solid var(--accent-strong);
		outline-offset: 4px;
		border-radius: 4px;
	}

	/* ℹ️ To calculate a new color for the sig: https://codepen.io/sosuke/pen/Pjoqqp
	   (recipes live in the --sig-filter theme token in +layout.svelte) */
	.sig {
		width: clamp(1rem, 25vw, 9rem);
		/* the width/height attributes give the box its shape before the file
		   arrives; height: auto lets the CSS width set the size */
		height: auto;
		transform: translateY(0.1em);
		filter: var(--sig-filter);
	}
</style>
