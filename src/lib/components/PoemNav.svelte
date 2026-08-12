<script>
  /** @type {string|null} */
  export let previousUrl = null;
  /** @type {string|null} */
  export let nextUrl = null;
  /** @type {string} */
  export let previousTitle = '';
  /** @type {string} */
  export let nextTitle = '';
</script>

{#if previousUrl || nextUrl}
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
{/if}

<style>
  .poem-nav {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .nav-links {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 2rem;
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

  .nav-link.next {
    margin-left: auto;
    text-align: right;
  }

  .arrow {
    font-style: normal;
    font-size: 0.9em;
  }
</style>
