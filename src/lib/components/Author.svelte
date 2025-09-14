<span class="author"
	><span class="by">by</span><img
		class="sig"
		src="/artist-sig.png"
		alt="Allisin Bloom signature"
	/></span
>

<style>
	.author {
		display: inline-flex;
		align-items: baseline;
		gap: clamp(0.1em, 2vw, 0.5rem);
		font-family: 'Noto Sans', sans-serif;
		font-weight: 100;
		margin-bottom: 1.5rem;
	}

	.by {
		line-height: 1;
		font-size: clamp(
			0.09rem,
			calc(0.09rem + (1.5rem - 0.09rem) * ((100vw - 50px) / (568px - 50px))),
			1.5rem
		);
	}
	/* ℹ️ To calculate a new color for the sig: https://codepen.io/sosuke/pen/Pjoqqp */
	.sig {
		width: clamp(1rem, 25vw, 9rem);
		transform: translateY(0.1em);
		filter: invert(21%) sepia(4%) saturate(3757%) hue-rotate(314deg) brightness(98%) contrast(88%);		
	}
</style>
