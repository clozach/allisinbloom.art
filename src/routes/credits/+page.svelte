<script>
	// Where the Net's data comes from, as the licences ask: one source of truth,
	// src/lib/net/credits.txt, rendered as prose with its addresses live.
	import credits from '$lib/net/credits.txt?raw';
	const paragraphs = credits
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
	/** @param {string} text @returns {{ text: string, href?: string }[]} */
	function pieces(text) {
		const out = [];
		const re = /https?:\/\/[^\s)]+[^\s).,;]/g;
		let last = 0;
		for (const m of text.matchAll(re)) {
			if (m.index > last) out.push({ text: text.slice(last, m.index) });
			out.push({ text: m[0], href: m[0] });
			last = m.index + m[0].length;
		}
		if (last < text.length) out.push({ text: text.slice(last) });
		return out;
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<article class="credits">
	<h1>Credits</h1>
	{#each paragraphs as p}
		<p>
			{#each pieces(p) as piece}
				{#if piece.href}<a href={piece.href} rel={piece.href.startsWith('https://creativecommons.org/licenses/') ? 'license noopener' : 'noopener'}>{piece.text}</a>{:else}{piece.text}{/if}
			{/each}
		</p>
	{/each}
	<p class="back"><a href="/">The Net</a></p>
</article>

<style>
	.credits {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 1.25rem;
		font-size: 0.9em;
		line-height: 1.7;
	}
	h1 {
		font-family: 'Noto Serif Display', serif;
		font-stretch: semi-condensed;
		font-weight: bold;
		font-size: 1.4em;
		margin-bottom: 1.5rem;
	}
	p {
		margin: 0 0 1.2em;
		overflow-wrap: anywhere;
	}
	.back {
		margin-top: 2.5rem;
		font-style: italic;
	}
</style>
