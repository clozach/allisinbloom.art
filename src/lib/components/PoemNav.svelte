<script>
  /** @type {string|null} */
  export let previousUrl = null;
  /** @type {string|null} */
  export let nextUrl = null;
  /** @type {string} */
  export let previousTitle = '';
  /** @type {string} */
  export let nextTitle = '';

  const BLUESKY = 'https://bsky.app/profile/allisinbloom.bsky.social';
</script>

<nav class="poem-nav" aria-label="Poem navigation">
  <hr />
  <div class="nav-links">
    {#if previousUrl}
      <a href={previousUrl} class="nav-link prev" aria-label="Previous poem: {previousTitle}">
        <span class="arrow" aria-hidden="true">←</span>
        <span class="title">{previousTitle}</span>
      </a>
    {:else}
      <span></span>
    {/if}
    <!-- Allisin on Bluesky: the butterfly in body ink, centred between the titles -->
    <a
      class="sky"
      href={BLUESKY}
      target="_blank"
      rel="noopener noreferrer"
      title="Bluesky"
      aria-label="Allisin Bloom on Bluesky (opens in a new tab)"
    >
      <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"
        />
      </svg>
    </a>
    {#if nextUrl}
      <a href={nextUrl} class="nav-link next" aria-label="Next poem: {nextTitle}">
        <span class="title">{nextTitle}</span>
        <span class="arrow" aria-hidden="true">→</span>
      </a>
    {:else}
      <span></span>
    {/if}
  </div>
</nav>

<style>
  .poem-nav {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  /* prev · butterfly · next. The row keeps its pre-butterfly intrinsic width
     (titles + 2 rem): the butterfly's box is cancelled by half-width negative
     margins, so it floats in the existing whitespace instead of widening the
     nav — which would widen <main> (it shrink-wraps) and shift the poem. */
  .nav-links {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
  }

  .nav-link {
    display: flex;
    align-items: baseline;
    gap: 0.5em;
    font-style: italic;
    font-size: 0.85em;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .nav-link:hover {
    opacity: 1;
  }
  /* no º here: in the poem nav the arrows and the whitespace already say
     "link" (Al, 2026-08-23) — the site-wide a::after mark is for links in prose */
  .nav-link::after {
    content: none;
  }

  .nav-link.next {
    margin-left: auto;
    justify-content: flex-end;
    text-align: right;
  }

  .arrow {
    font-style: normal;
    font-size: 0.9em;
  }

  /* the butterfly: body ink, no º, same quiet opacity ramp as the titles */
  .sky {
    --size: 1.05em;
    flex: 0 0 var(--size);
    width: var(--size);
    margin: 0 calc(var(--size) / -2);
    align-self: center;
    display: inline-flex;
    color: var(--ink);
    font-size: var(--size);
    line-height: 0;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  .sky::after {
    content: none;
  }
  .sky:hover,
  .sky:focus-visible {
    color: var(--ink);
    opacity: 1;
  }
  .sky:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 4px;
    border-radius: 4px;
  }
</style>
